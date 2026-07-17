import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  previewMigratedActivationCampaign,
  processActivationCampaign,
  startMigratedActivationCampaign,
} from "@/lib/email-campaigns";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  if (searchParams.get("preview") === "true") {
    return NextResponse.json(await previewMigratedActivationCampaign());
  }

  const campaigns = await prisma.emailCampaign.findMany({
    orderBy: { created_at: "desc" },
    take: 20,
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "start");

  if (action === "start") {
    const running = await prisma.emailCampaign.findFirst({ where: { status: "Running" } });
    if (running) return NextResponse.json({ message: "A campaign is already running", campaign: running }, { status: 409 });
    const campaign = await startMigratedActivationCampaign(session.user.id, body.dailyCap ? Number(body.dailyCap) : undefined);
    return NextResponse.json(campaign, { status: 201 });
  }

  if (action === "process") {
    return NextResponse.json(await processActivationCampaign(body.campaignId ? String(body.campaignId) : undefined));
  }

  const id = String(body.campaignId || "");
  const campaign = id ? await prisma.emailCampaign.findUnique({ where: { id } }) : null;
  if (!campaign) return NextResponse.json({ message: "Campaign not found" }, { status: 404 });

  if (action === "pause") {
    return NextResponse.json(await prisma.emailCampaign.update({ where: { id }, data: { status: "Paused", paused_at: new Date() } }));
  }
  if (action === "resume") {
    return NextResponse.json(await prisma.emailCampaign.update({ where: { id }, data: { status: "Running", paused_at: null } }));
  }
  if (action === "stop") {
    return NextResponse.json(await prisma.emailCampaign.update({ where: { id }, data: { status: "Stopped" } }));
  }

  return NextResponse.json({ message: "Unsupported campaign action" }, { status: 400 });
}
