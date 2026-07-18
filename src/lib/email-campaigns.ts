import { prisma } from "@/lib/prisma";
import { createPasswordSetupLink, RESET_TTL_MINUTES } from "@/lib/account-activation";
import { sendPortalActivationEmail } from "@/lib/mailer";
import { getSetting, setSetting } from "@/lib/settings";

export const MIGRATED_ACTIVATION_CAMPAIGN = "migrated_customer_portal_activation";
export const DEFAULT_RESERVED_QUOTA = 50;
export const DEFAULT_CAMPAIGN_DAILY_CAP = 100;

export type CampaignEmailSettings = {
  providerDailyQuota: number | null;
  dailyCap: number;
  reservedQuota: number;
  throttleMs: number;
};

export const DEFAULT_CAMPAIGN_EMAIL_SETTINGS: CampaignEmailSettings = {
  providerDailyQuota: Number(process.env.EMAIL_PROVIDER_DAILY_QUOTA || 0) || null,
  dailyCap: Number(process.env.EMAIL_CAMPAIGN_DAILY_CAP || DEFAULT_CAMPAIGN_DAILY_CAP),
  reservedQuota: Number(process.env.EMAIL_CAMPAIGN_RESERVED_QUOTA || DEFAULT_RESERVED_QUOTA),
  throttleMs: Number(process.env.EMAIL_CAMPAIGN_THROTTLE_MS || 750),
};

function cleanEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function isDeliverableCustomerEmail(value?: string | null) {
  const email = cleanEmail(value);
  return Boolean(email) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.endsWith("@client.local");
}

export function campaignCapacity(params: {
  providerAvailableCapacity: number | null;
  reservedQuota: number;
  dailyCap: number;
  remainingEligible: number;
}) {
  const providerCapacity = params.providerAvailableCapacity === null
    ? params.dailyCap
    : Math.max(0, params.providerAvailableCapacity - params.reservedQuota);
  return Math.min(
    Math.max(0, params.remainingEligible),
    Math.max(0, providerCapacity),
    Math.max(0, params.dailyCap),
  );
}

export async function getCampaignEmailSettings() {
  return getSetting("emailCampaigns", DEFAULT_CAMPAIGN_EMAIL_SETTINGS);
}

export async function saveCampaignEmailSettings(patch: Partial<CampaignEmailSettings>) {
  const current = await getCampaignEmailSettings();
  const next: CampaignEmailSettings = {
    providerDailyQuota: patch.providerDailyQuota === undefined
      ? current.providerDailyQuota
      : patch.providerDailyQuota === null
        ? null
        : Math.max(0, Math.trunc(Number(patch.providerDailyQuota || 0))),
    dailyCap: Math.max(0, Math.trunc(Number(patch.dailyCap ?? current.dailyCap))),
    reservedQuota: Math.max(0, Math.trunc(Number(patch.reservedQuota ?? current.reservedQuota))),
    throttleMs: Math.max(0, Math.trunc(Number(patch.throttleMs ?? current.throttleMs))),
  };
  await setSetting("emailCampaigns", next);
  return next;
}

async function importedClientIds() {
  const rows = await prisma.oldClientHistory.findMany({
    where: { client_id: { not: null } },
    select: { client_id: true },
  });
  return Array.from(new Set(rows.map((row) => row.client_id).filter(Boolean) as string[]));
}

export async function eligibleMigratedActivationUsers() {
  const ids = await importedClientIds();
  if (!ids.length) return [];
  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      role: "CLIENT",
      is_active: true,
      emailVerified: null,
      password_hash: null,
      portal_activated_at: null,
      email_suppressed: false,
      email_unsubscribed: false,
      email_bounced: false,
      email_excluded: false,
    },
    select: { id: true, name: true, email: true, account_state: true },
  });
  const sentRecipients = await prisma.emailCampaignRecipient.findMany({
    where: { campaign_type: MIGRATED_ACTIVATION_CAMPAIGN, status: "Sent" },
    select: { customer_id: true },
  });
  const sent = new Set(sentRecipients.map((row) => row.customer_id));
  return users.filter((user) => isDeliverableCustomerEmail(user.email) && !sent.has(user.id));
}

export async function getCampaignPreview() {
  const [settings, eligible, runningCampaign] = await Promise.all([
    getCampaignEmailSettings(),
    eligibleMigratedActivationUsers(),
    prisma.emailCampaign.findFirst({
      where: { campaign_type: MIGRATED_ACTIVATION_CAMPAIGN, status: { in: ["Draft", "Running", "Paused"] } },
      orderBy: { created_at: "desc" },
    }),
  ]);
  const sentToday = await sentTodayCount();
  const available = settings.providerDailyQuota === null ? null : Math.max(0, settings.providerDailyQuota - sentToday);
  const capacity = campaignCapacity({
    providerAvailableCapacity: available,
    reservedQuota: settings.reservedQuota,
    dailyCap: settings.dailyCap,
    remainingEligible: eligible.length,
  });
  return { settings, eligibleCount: eligible.length, sentToday, providerAvailableCapacity: available, dailyCampaignCapacity: capacity, campaign: runningCampaign };
}

async function sentTodayCount() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return prisma.emailLog.count({ where: { status: "Sent", sent_at: { gte: start } } });
}

export async function startMigratedActivationCampaign(createdBy: string, dailyCap?: number) {
  const settings = dailyCap !== undefined ? await saveCampaignEmailSettings({ dailyCap }) : await getCampaignEmailSettings();
  const eligible = await eligibleMigratedActivationUsers();
  const campaign = await prisma.emailCampaign.create({
    data: {
      campaign_type: MIGRATED_ACTIVATION_CAMPAIGN,
      status: "Running",
      started_at: new Date(),
      daily_cap: settings.dailyCap,
      reserved_quota: settings.reservedQuota,
      total_eligible: eligible.length,
      created_by: createdBy,
    },
  });

  let queued = 0;
  let skipped = 0;
  for (const user of eligible) {
    try {
      await prisma.emailCampaignRecipient.create({
        data: {
          campaign_id: campaign.id,
          campaign_type: MIGRATED_ACTIVATION_CAMPAIGN,
          customer_id: user.id,
          email: cleanEmail(user.email),
          status: "Queued",
          queued_at: new Date(),
          activation_status: user.account_state || "Portal invite pending",
        },
      });
      queued += 1;
    } catch {
      skipped += 1;
    }
  }
  await prisma.user.updateMany({
    where: { id: { in: eligible.map((user) => user.id) }, account_state: { in: ["Imported", "Portal invite pending", "Invite failed"] } },
    data: { account_state: "Invite queued" },
  });
  const updated = await refreshCampaignCounts(campaign.id);
  return { ...updated, initial_queued: queued, initial_skipped: skipped };
}

export async function updateCampaignStatus(id: string, status: "Running" | "Paused" | "Stopped") {
  const data: any = { status };
  if (status === "Paused") data.paused_at = new Date();
  if (status === "Stopped") data.stopped_at = new Date();
  if (status === "Running") data.paused_at = null;
  await prisma.emailCampaign.update({ where: { id }, data });
  return refreshCampaignCounts(id);
}

export async function refreshCampaignCounts(campaignId: string) {
  const recipients = await prisma.emailCampaignRecipient.groupBy({
    by: ["status"],
    where: { campaign_id: campaignId },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(recipients.map((row) => [row.status, row._count._all]));
  const totalOpen = Number(counts.Queued || 0) + Number(counts.Failed || 0) + Number(counts.Processing || 0);
  return prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      queued: Number(counts.Queued || 0),
      sent: Number(counts.Sent || 0),
      failed: Number(counts.Failed || 0),
      skipped: Number(counts.Skipped || 0),
      activated: Number(counts.Activated || 0),
      ...(totalOpen === 0 && (Number(counts.Sent || 0) > 0 || Number(counts.Skipped || 0) > 0)
        ? { status: "Completed", completed_at: new Date() }
        : {}),
    },
  });
}

export async function processMigratedActivationCampaign(campaignId?: string) {
  const campaign = campaignId
    ? await prisma.emailCampaign.findUnique({ where: { id: campaignId } })
    : await prisma.emailCampaign.findFirst({ where: { campaign_type: MIGRATED_ACTIVATION_CAMPAIGN, status: "Running" }, orderBy: { created_at: "asc" } });
  if (!campaign || campaign.status !== "Running") return { processed: 0, sent: 0, failed: 0, skipped: 0, message: "No running campaign" };

  const preview = await getCampaignPreview();
  const limit = Math.min(
    Math.max(0, preview.dailyCampaignCapacity),
    Math.max(0, campaign.daily_cap ?? preview.settings.dailyCap),
  );
  if (limit <= 0) return { processed: 0, sent: 0, failed: 0, skipped: 0, message: "No email capacity available after reserve" };

  const recipients = await prisma.emailCampaignRecipient.findMany({
    where: {
      campaign_id: campaign.id,
      status: { in: ["Queued", "Failed"] },
      OR: [{ next_attempt_at: null }, { next_attempt_at: { lte: new Date() } }],
    },
    orderBy: [{ queued_at: "asc" }, { created_at: "asc" }],
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const recipient of recipients) {
    const locked = await prisma.emailCampaignRecipient.updateMany({
      where: { id: recipient.id, status: { in: ["Queued", "Failed"] } },
      data: { status: "Processing", attempted_at: new Date(), attempt_count: { increment: 1 }, last_error: null },
    });
    if (!locked.count) continue;

    const user = await prisma.user.findUnique({ where: { id: recipient.customer_id }, select: { id: true, name: true, email: true, emailVerified: true, password_hash: true, is_active: true, email_suppressed: true, email_unsubscribed: true, email_bounced: true, email_excluded: true } });
    if (!user?.is_active || user.emailVerified || user.password_hash || user.email_suppressed || user.email_unsubscribed || user.email_bounced || user.email_excluded || !isDeliverableCustomerEmail(user.email)) {
      await prisma.emailCampaignRecipient.update({ where: { id: recipient.id }, data: { status: "Skipped", skipped_reason: "No longer eligible" } });
      skipped += 1;
      continue;
    }

    const link = await createPasswordSetupLink(recipient.email);
    const result = await sendPortalActivationEmail(recipient.email, {
      userName: user.name || "there",
      activationUrl: link.url,
      expiresMinutes: RESET_TTL_MINUTES,
    }, {
      relatedUserId: user.id,
      relatedCampaignId: campaign.id,
      idempotencyKey: `portal-activation:${campaign.campaign_type}:${user.id}`,
    });

    if (result.success) {
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "Sent", sent_at: new Date(), provider_message_id: result.messageId || null, token_reference: link.tokenReference, activation_status: "Invite sent" },
      });
      await prisma.user.update({ where: { id: user.id }, data: { account_state: "Invite sent", portal_invited_at: new Date() } });
      sent += 1;
    } else {
      const attempts = recipient.attempt_count + 1;
      const delayMinutes = Math.min(1440, Math.pow(2, Math.min(attempts, 8)) * 5);
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "Failed", last_error: result.error, next_attempt_at: new Date(Date.now() + delayMinutes * 60 * 1000), activation_status: "Invite failed" },
      });
      await prisma.user.update({ where: { id: user.id }, data: { account_state: "Invite failed" } });
      failed += 1;
    }

    if (preview.settings.throttleMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, preview.settings.throttleMs));
    }
  }

  await refreshCampaignCounts(campaign.id);
  return { processed: recipients.length, sent, failed, skipped, message: "Processed campaign batch" };
}
