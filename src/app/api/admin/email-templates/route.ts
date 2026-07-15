import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { TEMPLATE_KEYS, DEFAULT_EMAIL_TEMPLATES, getEmailTemplateOverrides, effectiveTemplate } from "@/lib/reminders/email-templates";

export const runtime = "nodejs";

// GET /api/admin/email-templates — list all templates (summary)
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const overrides = await getEmailTemplateOverrides();
  const items = TEMPLATE_KEYS.map((key) => {
    const t = effectiveTemplate(key, overrides);
    return {
      key,
      name: DEFAULT_EMAIL_TEMPLATES[key].name,
      subject: t.subject,
      is_active: t.is_active,
      is_customized: t.is_customized,
    };
  });
  return NextResponse.json(items);
}
