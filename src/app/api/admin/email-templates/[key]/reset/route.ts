import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { isTemplateKey, resetEmailTemplate } from "@/lib/reminders/email-templates";

export const runtime = "nodejs";

// POST /api/admin/email-templates/:key/reset — restore the default template
export async function POST(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  const { key } = await params;
  if (!isTemplateKey(key)) return NextResponse.json({ message: "Unknown template" }, { status: 404 });

  await resetEmailTemplate(key);
  return NextResponse.json({ ok: true });
}
