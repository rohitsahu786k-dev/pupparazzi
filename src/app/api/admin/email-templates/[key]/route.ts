import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  isTemplateKey, DEFAULT_EMAIL_TEMPLATES, getEmailTemplateOverrides,
  effectiveTemplate, saveEmailTemplate, type StoredTemplate,
} from "@/lib/reminders/email-templates";

export const runtime = "nodejs";

// GET /api/admin/email-templates/:key — full editable template + its default
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  const { key } = await params;
  if (!isTemplateKey(key)) return NextResponse.json({ message: "Unknown template" }, { status: 404 });

  const overrides = await getEmailTemplateOverrides();
  const eff = effectiveTemplate(key, overrides);
  const def = DEFAULT_EMAIL_TEMPLATES[key];
  return NextResponse.json({
    key,
    name: def.name,
    subject: eff.subject,
    html_body: eff.html_body,
    text_body: eff.text_body,
    is_active: eff.is_active,
    is_customized: eff.is_customized,
    variables: def.variables,
    defaults: { subject: def.subject, html_body: def.html_body, text_body: def.text_body },
  });
}

// PUT /api/admin/email-templates/:key — save subject/html/text/active
export async function PUT(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  const { key } = await params;
  if (!isTemplateKey(key)) return NextResponse.json({ message: "Unknown template" }, { status: 404 });

  let body: Partial<StoredTemplate>;
  try {
    body = (await req.json()) as Partial<StoredTemplate>;
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const patch: StoredTemplate = {};
  if (typeof body.subject === "string") patch.subject = body.subject.slice(0, 300);
  if (typeof body.html_body === "string") patch.html_body = body.html_body.slice(0, 60000);
  if (typeof body.text_body === "string") patch.text_body = body.text_body.slice(0, 20000);
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

  const saved = await saveEmailTemplate(key, patch);
  return NextResponse.json(saved);
}
