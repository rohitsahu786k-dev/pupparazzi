import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { processMigratedActivationCampaign, updateCampaignStatus } from "@/lib/email-campaigns";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || 25)));
  const where = {
    campaign_id: id,
    ...(status ? { status } : {}),
    ...(q ? { email: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const [campaign, total, recipients] = await Promise.all([
    prisma.emailCampaign.findUnique({ where: { id } }),
    prisma.emailCampaignRecipient.count({ where }),
    prisma.emailCampaignRecipient.findMany({
      where,
      orderBy: [{ updated_at: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return NextResponse.json({ campaign, total, recipients });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (body.action === "process") return NextResponse.json(await processMigratedActivationCampaign(id));
  if (body.action === "retry_failed") {
    await prisma.emailCampaignRecipient.updateMany({
      where: { campaign_id: id, status: "Failed" },
      data: { status: "Queued", next_attempt_at: null, last_error: null },
    });
    return NextResponse.json(await updateCampaignStatus(id, "Running"));
  }
  if (["Running", "Paused", "Stopped"].includes(body.status)) {
    return NextResponse.json(await updateCampaignStatus(id, body.status));
  }
  return NextResponse.json({ message: "Unsupported campaign action" }, { status: 400 });
}
