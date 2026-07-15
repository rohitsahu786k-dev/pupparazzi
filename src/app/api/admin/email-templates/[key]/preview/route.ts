import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { isTemplateKey, getEmailTemplateOverrides, type EmailTemplateOverrides } from "@/lib/reminders/email-templates";
import { renderSampleForKey } from "@/lib/reminders/emails";

export const runtime = "nodejs";

/** Strip scripts / event handlers / javascript: URLs so the preview cannot execute. */
function sanitizePreview(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

// POST /api/admin/email-templates/:key/preview — render with sample data
// Body (optional): { subject, html_body, text_body } to preview an unsaved draft.
export async function POST(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  const { key } = await params;
  if (!isTemplateKey(key)) return NextResponse.json({ message: "Unknown template" }, { status: 404 });

  let draft: { subject?: string; html_body?: string; text_body?: string } | null = null;
  try {
    const body = await req.json();
    if (body && (body.subject !== undefined || body.html_body !== undefined || body.text_body !== undefined)) draft = body;
  } catch {
    // no body → preview the saved/default template
  }

  const overrides: EmailTemplateOverrides = draft
    ? { [key]: { subject: draft.subject, html_body: draft.html_body, text_body: draft.text_body, is_active: true } }
    : await getEmailTemplateOverrides();

  const email = renderSampleForKey(key, overrides);
  return NextResponse.json({ subject: email.subject, html: sanitizePreview(email.html), text: email.text });
}
