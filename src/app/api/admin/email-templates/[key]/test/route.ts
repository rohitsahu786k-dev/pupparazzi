import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sendMail } from "@/lib/mailer";
import { isTemplateKey, getEmailTemplateOverrides } from "@/lib/reminders/email-templates";
import { renderSampleForKey } from "@/lib/reminders/emails";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/admin/email-templates/:key/test — send the sample-rendered template
export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  const { key } = await params;
  if (!isTemplateKey(key)) return NextResponse.json({ message: "Unknown template" }, { status: 404 });

  let to = "";
  try {
    to = String((await req.json())?.to || "").trim();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }
  if (!EMAIL_RE.test(to)) return NextResponse.json({ message: "A valid recipient email is required" }, { status: 400 });

  const overrides = await getEmailTemplateOverrides();
  const email = renderSampleForKey(key, overrides);
  const result = await sendMail({ to, subject: `[TEST] ${email.subject}`, html: email.html, text: email.text });
  return NextResponse.json(result, { status: result.success ? 200 : 502 });
}
