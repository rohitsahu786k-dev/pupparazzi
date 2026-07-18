import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  getCampaignPreview,
  saveCampaignEmailSettings,
  startMigratedActivationCampaign,
} from "@/lib/email-campaigns";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const [preview, campaigns] = await Promise.all([
    getCampaignPreview(),
    prisma.emailCampaign.findMany({
      orderBy: { created_at: "desc" },
      take: 20,
    }),
  ]);
  return NextResponse.json({ ...preview, campaigns });
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const settings = await saveCampaignEmailSettings({
    providerDailyQuota: body.providerDailyQuota,
    dailyCap: body.dailyCap,
    reservedQuota: body.reservedQuota,
    throttleMs: body.throttleMs,
  });
  return NextResponse.json({ settings });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const campaign = await startMigratedActivationCampaign(session.user.id, body.dailyCap);
  return NextResponse.json(campaign, { status: 201 });
}
