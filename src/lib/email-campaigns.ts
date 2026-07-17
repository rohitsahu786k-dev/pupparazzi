import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { createPasswordSetupLink } from "@/lib/account-activation";
import { sendPortalActivationEmail } from "@/lib/mailer";

export const MIGRATION_CAMPAIGN_TYPE = "migrated_customer_activation";

export type EmailCampaignSettings = {
  providerDailyQuota: number;
  providerDailyUsed: number;
  dailyBatchCap: number;
  reservedQuota: number;
  processorBatchSize: number;
};

export const DEFAULT_EMAIL_CAMPAIGN_SETTINGS: EmailCampaignSettings = {
  providerDailyQuota: Number(process.env.EMAIL_PROVIDER_DAILY_QUOTA || 0),
  providerDailyUsed: 0,
  dailyBatchCap: Number(process.env.EMAIL_CAMPAIGN_DAILY_CAP || 100),
  reservedQuota: Number(process.env.EMAIL_CAMPAIGN_RESERVED_QUOTA || 50),
  processorBatchSize: Number(process.env.EMAIL_CAMPAIGN_PROCESSOR_BATCH_SIZE || 20),
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailAddress(value: unknown) {
  return EMAIL_RE.test(String(value || "").trim().toLowerCase());
}

export async function campaignSettings() {
  return getSetting("email_campaign_settings", DEFAULT_EMAIL_CAMPAIGN_SETTINGS);
}

export function campaignCapacity(settings: EmailCampaignSettings) {
  const available = Math.max(0, Number(settings.providerDailyQuota || 0) - Number(settings.providerDailyUsed || 0));
  return Math.min(
    Math.max(0, available - Number(settings.reservedQuota || 50)),
    Math.max(0, Number(settings.dailyBatchCap || 0)),
  );
}

export async function eligibleMigratedCustomers() {
  const alreadySent = await prisma.emailCampaignRecipient.findMany({
    where: {
      campaign: { campaign_type: MIGRATION_CAMPAIGN_TYPE },
      status: "Sent",
    },
    select: { user_id: true },
  });
  const sentIds = new Set(alreadySent.map((row) => row.user_id));

  const importedUserIds = new Set(
    (await prisma.oldClientHistory.findMany({
      where: { client_id: { not: null } },
      select: { client_id: true },
    })).map((row) => row.client_id).filter(Boolean) as string[],
  );

  const users = await prisma.user.findMany({
    where: {
      role: "CLIENT",
      is_active: true,
      email: { not: null },
    },
    select: { id: true, name: true, email: true, emailVerified: true, password_hash: true },
  });

  return users.filter((user) => {
    const email = user.email || "";
    if (!isValidEmailAddress(email)) return false;
    if (sentIds.has(user.id)) return false;
    if (user.emailVerified && user.password_hash) return false;
    return importedUserIds.has(user.id) || !user.password_hash || !user.emailVerified;
  });
}

export async function previewMigratedActivationCampaign() {
  const [eligible, settings] = await Promise.all([eligibleMigratedCustomers(), campaignSettings()]);
  const capacity = campaignCapacity(settings);
  return {
    eligible: eligible.length,
    capacity,
    reservedQuota: settings.reservedQuota,
    dailyBatchCap: settings.dailyBatchCap,
    providerDailyQuota: settings.providerDailyQuota,
    providerDailyUsed: settings.providerDailyUsed,
    estimatedDays: capacity > 0 ? Math.ceil(eligible.length / capacity) : null,
  };
}

export async function startMigratedActivationCampaign(createdBy: string, dailyCap?: number) {
  const settings = await campaignSettings();
  const eligible = await eligibleMigratedCustomers();
  const campaign = await prisma.emailCampaign.create({
    data: {
      campaign_type: MIGRATION_CAMPAIGN_TYPE,
      status: "Running",
      started_at: new Date(),
      daily_cap: dailyCap || settings.dailyBatchCap,
      reserved_quota: settings.reservedQuota,
      provider_daily_quota: settings.providerDailyQuota,
      provider_daily_used: settings.providerDailyUsed,
      total_eligible: eligible.length,
      queued: eligible.length,
      created_by: createdBy,
    },
  });

  for (const user of eligible) {
    await prisma.emailCampaignRecipient.upsert({
      where: { campaign_id_user_id: { campaign_id: campaign.id, user_id: user.id } },
      update: {},
      create: {
        campaign_id: campaign.id,
        user_id: user.id,
        email: user.email!,
        status: "Queued",
      },
    });
  }
  return campaign;
}

async function refreshCampaignCounts(campaignId: string) {
  const grouped = await prisma.emailCampaignRecipient.groupBy({
    by: ["status"],
    where: { campaign_id: campaignId },
    _count: { _all: true },
  });
  const count = (status: string) => grouped.find((row) => row.status === status)?._count._all || 0;
  const queued = count("Queued") + count("Processing");
  const sent = count("Sent");
  const failed = count("Failed");
  const skipped = count("Skipped");
  const activated = count("Activated");
  const remaining = queued + failed;
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      queued,
      sent,
      failed,
      skipped,
      activated,
      ...(remaining === 0 ? { status: "Completed", completed_at: new Date() } : {}),
    },
  });
}

export async function processActivationCampaign(campaignId?: string) {
  const settings = await campaignSettings();
  const campaign = campaignId
    ? await prisma.emailCampaign.findUnique({ where: { id: campaignId } })
    : await prisma.emailCampaign.findFirst({ where: { campaign_type: MIGRATION_CAMPAIGN_TYPE, status: "Running" }, orderBy: { started_at: "asc" } });
  if (!campaign || campaign.status !== "Running") return { processed: 0, sent: 0, failed: 0, skipped: 0, reason: "No running campaign" };

  const capacity = Math.min(
    campaignCapacity({ ...settings, dailyBatchCap: campaign.daily_cap || settings.dailyBatchCap, reservedQuota: campaign.reserved_quota }),
    settings.processorBatchSize,
  );
  if (capacity <= 0) return { processed: 0, sent: 0, failed: 0, skipped: 0, reason: "No email capacity after reserve" };

  const now = new Date();
  const recipients = await prisma.emailCampaignRecipient.findMany({
    where: {
      campaign_id: campaign.id,
      status: { in: ["Queued", "Failed"] },
      OR: [{ next_attempt_at: null }, { next_attempt_at: { lte: now } }],
      excluded_at: null,
    },
    orderBy: [{ queued_at: "asc" }],
    take: capacity,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const recipient of recipients) {
    const claim = await prisma.emailCampaignRecipient.updateMany({
      where: { id: recipient.id, status: recipient.status },
      data: { status: "Processing", attempted_at: new Date(), attempt_count: { increment: 1 } },
    });
    if (!claim.count) continue;

    const user = await prisma.user.findUnique({ where: { id: recipient.user_id }, select: { id: true, name: true, email: true, emailVerified: true, password_hash: true } });
    if (!user || !user.email || !isValidEmailAddress(user.email) || (user.emailVerified && user.password_hash)) {
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "Skipped", skipped_reason: "No longer eligible" },
      });
      skipped += 1;
      continue;
    }

    const link = await createPasswordSetupLink(user.email);
    const result = await sendPortalActivationEmail(user.email, {
      userName: user.name || "there",
      setupUrl: link.url,
      expiresMinutes: link.expiresMinutes,
    }, {
      relatedUserId: user.id,
      relatedCampaignId: campaign.id,
      idempotencyKey: `${MIGRATION_CAMPAIGN_TYPE}:${campaign.id}:${user.id}`,
    });

    if (result.success) {
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "Sent",
          sent_at: new Date(),
          provider_message_id: result.messageId || null,
          token_reference: link.tokenReference,
          last_error: null,
        },
      });
      sent += 1;
    } else {
      const attempts = recipient.attempt_count + 1;
      const permanent = attempts >= 5;
      await prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: permanent ? "Failed" : "Queued",
          last_error: result.error,
          next_attempt_at: permanent ? null : new Date(Date.now() + Math.min(24 * 60, 2 ** attempts * 15) * 60 * 1000),
        },
      });
      failed += 1;
    }
  }

  await refreshCampaignCounts(campaign.id);
  return { processed: recipients.length, sent, failed, skipped };
}
