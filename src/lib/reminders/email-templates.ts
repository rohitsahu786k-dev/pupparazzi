/**
 * Database-backed email template system for the reminder engine.
 *
 * Every reminder email is rendered through renderTemplate(). Admins can override
 * the subject / HTML body / text body / active flag per template key; overrides
 * are stored under AppSetting("email_templates"). When no (valid) override
 * exists we fall back to the DEFAULT_EMAIL_TEMPLATES below, so the engine always
 * has a working template.
 *
 * Rendering rules:
 *  - `{{var}}` placeholders are replaced from a flat variable map.
 *  - In the HTML body, scalar variables are HTML-escaped; a small set of
 *    server-generated fragments (RAW_VARIABLES) are injected as-is.
 *  - Subject and text bodies are substituted without HTML escaping.
 *  - Missing/optional variables render as empty strings (never break the email).
 *  - The HTML body is wrapped in the shared branded baseLayout.
 */

import { baseLayout, escapeHtml } from "@/lib/mailer";
import { getSetting, setSetting } from "@/lib/settings";

export const EMAIL_TEMPLATES_KEY = "email_templates";

export const TEMPLATE_KEYS = [
  "birthday",
  "birthday_greeting",
  "vaccination_due_soon",
  "vaccination_due_today",
  "vaccination_overdue",
  "vaccination_updated",
  "vaccination_completed",
  "admin_summary",
  "delivery_failure",
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export function isTemplateKey(v: unknown): v is TemplateKey {
  return typeof v === "string" && (TEMPLATE_KEYS as readonly string[]).includes(v);
}

/** Server-generated HTML fragments that must NOT be escaped when injected. */
export const RAW_VARIABLES = new Set([
  "petPhotoBlock",
  "detailsTable",
  "ctaButton",
  "footerNote",
  "summaryTable",
]);

export type StoredTemplate = {
  subject?: string;
  html_body?: string;
  text_body?: string;
  is_active?: boolean;
  updated_at?: string;
};

export type EmailTemplateOverrides = Partial<Record<TemplateKey, StoredTemplate>>;

export type TemplateDefinition = {
  key: TemplateKey;
  name: string;
  subject: string;
  html_body: string;
  text_body: string;
  /** Variable names available to this template (for the editor reference + preview). */
  variables: string[];
};

// Shared header band markup used by the default bodies (title/subtitle are escaped scalars).
function header(band: string) {
  return `<div style="background:linear-gradient(135deg,${band});padding:34px 44px 30px;text-align:center;">
  <h1 style="margin:0 0 8px;font-size:25px;font-weight:800;color:#FFFFFF;line-height:1.25;">{{headerTitle}}</h1>
  <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.72);line-height:1.6;">{{headerSubtitle}}</p>
</div>`;
}

function body(inner: string) {
  return `<div style="padding:34px 44px;" class="email-card">${inner}</div>`;
}

const COMMON_VARS = [
  "ownerName", "petName", "petType", "petBreed", "petAge", "petPhotoUrl",
  "petProfileUrl", "businessName", "businessLogoUrl", "supportEmail", "supportPhone", "currentYear",
];

export const DEFAULT_EMAIL_TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  birthday: {
    key: "birthday",
    name: "Pet birthday reminder",
    subject: "{{petName}}'s birthday is coming up",
    html_body: header("#0F172A 0%,#1E293B 100%") + body(`{{petPhotoBlock}}
      <p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.7;">Hello <strong style="color:#0F172A;">{{ownerName}}</strong>,</p>
      <p style="margin:0 0 22px;font-size:15px;color:#475569;line-height:1.7;">A special day is almost here. <strong>{{petName}}</strong> will be celebrating a birthday on <strong>{{birthdayDate}}</strong>. We hope the day is filled with happy moments, favourite treats and plenty of love.</p>
      {{detailsTable}}{{ctaButton}}{{footerNote}}`),
    text_body: "Hello {{ownerName}},\n\n{{petName}} will be celebrating a birthday on {{birthdayDate}}.\n\nView profile: {{petProfileUrl}}\n\nWarm regards,\n{{businessName}}",
    variables: [...COMMON_VARS, "birthdayDate", "daysUntilBirthday"],
  },
  birthday_greeting: {
    key: "birthday_greeting",
    name: "Pet birthday greeting",
    subject: "Happy Birthday, {{petName}}!",
    html_body: header("#BE185D 0%,#EA580C 100%") + body(`{{petPhotoBlock}}
      <p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.7;">Hello <strong style="color:#0F172A;">{{ownerName}}</strong>,</p>
      <p style="margin:0 0 22px;font-size:15px;color:#475569;line-height:1.7;">Everyone at {{businessName}} wishes <strong>{{petName}}</strong> a very happy birthday. May the year ahead bring good health, joyful walks, delicious treats and many memorable moments together.</p>
      {{ctaButton}}{{footerNote}}`),
    text_body: "Hello {{ownerName}},\n\nEveryone at {{businessName}} wishes {{petName}} a very happy birthday!\n\n{{petProfileUrl}}\n\nWarm wishes,\n{{businessName}}",
    variables: [...COMMON_VARS, "birthdayDate"],
  },
  vaccination_due_soon: {
    key: "vaccination_due_soon",
    name: "Vaccination due soon",
    subject: "Vaccination reminder for {{petName}} - {{vaccineName}}",
    html_body: header("#0F172A 0%,#1E293B 100%") + body(`{{petPhotoBlock}}
      <p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.7;">Hello <strong style="color:#0F172A;">{{ownerName}}</strong>,</p>
      <p style="margin:0 0 22px;font-size:15px;color:#475569;line-height:1.7;">This is a friendly reminder that <strong>{{petName}}</strong>'s <strong>{{vaccineName}}</strong> is due on <strong>{{nextDueDate}}</strong>. Keeping vaccination information up to date helps maintain a reliable health record for your pet.</p>
      {{detailsTable}}{{ctaButton}}{{footerNote}}`),
    text_body: "Hello {{ownerName}},\n\n{{petName}}'s {{vaccineName}} is due on {{nextDueDate}} ({{daysUntilDue}} days).\nVeterinarian: {{vetName}} {{vetContact}}\n\nView details: {{petProfileUrl}}\n\nRegards,\n{{businessName}}",
    variables: [...COMMON_VARS, "vaccineName", "administeredDate", "nextDueDate", "daysUntilDue", "vetName", "vetContact"],
  },
  vaccination_due_today: {
    key: "vaccination_due_today",
    name: "Vaccination due today",
    subject: "{{petName}}'s {{vaccineName}} is due today",
    html_body: header("#C2410C 0%,#EA580C 100%") + body(`{{petPhotoBlock}}
      <p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.7;">Hello <strong style="color:#0F172A;">{{ownerName}}</strong>,</p>
      <p style="margin:0 0 22px;font-size:15px;color:#475569;line-height:1.7;"><strong>{{petName}}</strong>'s <strong>{{vaccineName}}</strong> is due <strong>today</strong> ({{nextDueDate}}). Please arrange the appointment and update the record afterwards.</p>
      {{detailsTable}}{{ctaButton}}{{footerNote}}`),
    text_body: "Hello {{ownerName}},\n\n{{petName}}'s {{vaccineName}} is due today ({{nextDueDate}}).\n\nView details: {{petProfileUrl}}\n\nRegards,\n{{businessName}}",
    variables: [...COMMON_VARS, "vaccineName", "administeredDate", "nextDueDate", "daysUntilDue", "vetName", "vetContact"],
  },
  vaccination_overdue: {
    key: "vaccination_overdue",
    name: "Vaccination overdue",
    subject: "Action required: {{petName}}'s {{vaccineName}} is overdue",
    html_body: header("#7F1D1D 0%,#B91C1C 100%") + body(`{{petPhotoBlock}}
      <p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.7;">Hello <strong style="color:#0F172A;">{{ownerName}}</strong>,</p>
      <p style="margin:0 0 22px;font-size:15px;color:#475569;line-height:1.7;">Our records indicate that <strong>{{petName}}</strong>'s <strong>{{vaccineName}}</strong> was due on <strong>{{nextDueDate}}</strong> and is currently <strong>{{daysOverdue}} day(s)</strong> overdue. Please contact your veterinarian and update the record after completion.</p>
      {{detailsTable}}{{ctaButton}}{{footerNote}}`),
    text_body: "Hello {{ownerName}},\n\n{{petName}}'s {{vaccineName}} was due on {{nextDueDate}} and is {{daysOverdue}} day(s) overdue.\n\nView details: {{petProfileUrl}}\n\nRegards,\n{{businessName}}",
    variables: [...COMMON_VARS, "vaccineName", "administeredDate", "nextDueDate", "daysOverdue", "vetName", "vetContact"],
  },
  vaccination_updated: {
    key: "vaccination_updated",
    name: "Vaccination updated confirmation",
    subject: "{{vaccineName}} updated for {{petName}}",
    html_body: header("#065F46 0%,#047857 100%") + body(`
      <p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.7;">Hello <strong style="color:#0F172A;">{{ownerName}}</strong>,</p>
      <p style="margin:0 0 22px;font-size:15px;color:#475569;line-height:1.7;">We've updated <strong>{{vaccineName}}</strong> for <strong>{{petName}}</strong>. The next reminder will be based on the due date below.</p>
      {{detailsTable}}{{ctaButton}}{{footerNote}}`),
    text_body: "Hello {{ownerName}},\n\n{{vaccineName}} for {{petName}} has been updated. Next due: {{nextDueDate}}.\n\n{{petProfileUrl}}\n\nRegards,\n{{businessName}}",
    variables: [...COMMON_VARS, "vaccineName", "administeredDate", "nextDueDate"],
  },
  vaccination_completed: {
    key: "vaccination_completed",
    name: "Vaccination completed confirmation",
    subject: "{{vaccineName}} marked complete for {{petName}}",
    html_body: header("#065F46 0%,#047857 100%") + body(`
      <p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.7;">Hello <strong style="color:#0F172A;">{{ownerName}}</strong>,</p>
      <p style="margin:0 0 22px;font-size:15px;color:#475569;line-height:1.7;">We've recorded <strong>{{vaccineName}}</strong> for <strong>{{petName}}</strong> as completed{{administeredSuffix}}. Your pet's health record is up to date.</p>
      {{detailsTable}}{{ctaButton}}{{footerNote}}`),
    text_body: "Hello {{ownerName}},\n\n{{vaccineName}} for {{petName}} has been recorded as completed. Next due: {{nextDueDate}}.\n\n{{petProfileUrl}}\n\nRegards,\n{{businessName}}",
    variables: [...COMMON_VARS, "vaccineName", "administeredDate", "administeredSuffix", "nextDueDate"],
  },
  admin_summary: {
    key: "admin_summary",
    name: "Admin daily reminder summary",
    subject: "Reminder summary - {{dateLabel}}",
    html_body: header("#0F172A 0%,#1E293B 100%") + body(`
      <p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.7;">Daily reminder activity for <strong>{{dateLabel}}</strong>.</p>
      {{summaryTable}}{{ctaButton}}`),
    text_body: "Reminder summary for {{dateLabel}}\nBirthdays today: {{birthdaysToday}}\nVaccinations due today: {{vaccinationsDueToday}}\nOverdue: {{vaccinationsOverdue}}\nSent: {{sent}}, Skipped: {{skipped}}, Failed: {{failed}}",
    variables: ["dateLabel", "birthdaysToday", "birthdaysNext7", "vaccinationsDueToday", "vaccinationsNext7", "vaccinationsOverdue", "sent", "skipped", "failed", "businessName"],
  },
  delivery_failure: {
    key: "delivery_failure",
    name: "Reminder delivery failure alert",
    subject: "Reminder delivery failed - {{reminderType}}",
    html_body: header("#7F1D1D 0%,#B91C1C 100%") + body(`
      <p style="margin:0 0 18px;font-size:15px;color:#475569;line-height:1.7;">A reminder email could not be delivered and may need attention.</p>
      {{detailsTable}}
      <p style="margin:16px 0 0;font-size:13px;color:#B45309;line-height:1.6;">Error: {{errorMessage}}</p>{{ctaButton}}`),
    text_body: "Reminder delivery failed.\nType: {{reminderType}}\nRecipient: {{recipient}}\nPet: {{petName}}\nError: {{errorMessage}}",
    variables: ["reminderType", "recipient", "petName", "ownerName", "errorMessage", "businessName"],
  },
};

// ── Persistence ──────────────────────────────────────────────────────────────

export async function getEmailTemplateOverrides(): Promise<EmailTemplateOverrides> {
  return getSetting<EmailTemplateOverrides>(EMAIL_TEMPLATES_KEY, {});
}

export async function saveEmailTemplate(key: TemplateKey, patch: StoredTemplate): Promise<StoredTemplate> {
  const all = await getEmailTemplateOverrides();
  const next: StoredTemplate = {
    ...(all[key] || {}),
    ...patch,
    updated_at: new Date().toISOString(),
  };
  all[key] = next;
  await setSetting(EMAIL_TEMPLATES_KEY, all);
  return next;
}

export async function resetEmailTemplate(key: TemplateKey): Promise<void> {
  const all = await getEmailTemplateOverrides();
  delete all[key];
  await setSetting(EMAIL_TEMPLATES_KEY, all);
}

/** Merge default + stored override for display in the editor. */
export function effectiveTemplate(key: TemplateKey, overrides: EmailTemplateOverrides): TemplateDefinition & { is_active: boolean; is_customized: boolean } {
  const def = DEFAULT_EMAIL_TEMPLATES[key];
  const ov = overrides[key];
  return {
    ...def,
    subject: ov?.subject ?? def.subject,
    html_body: ov?.html_body ?? def.html_body,
    text_body: ov?.text_body ?? def.text_body,
    is_active: ov?.is_active !== false,
    is_customized: Boolean(ov && (ov.subject || ov.html_body || ov.text_body || ov.is_active === false)),
  };
}

// ── Rendering ────────────────────────────────────────────────────────────────

function substituteHtml(tpl: string, vars: Record<string, string | number | null | undefined>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const v = vars[k];
    if (v === undefined || v === null) return "";
    return RAW_VARIABLES.has(k) ? String(v) : escapeHtml(String(v));
  });
}

function substitutePlain(tpl: string, vars: Record<string, string | number | null | undefined>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

export type RenderedEmail = { subject: string; html: string; text: string; active: boolean };

/**
 * Render a template by key. `overrides` is optional; when omitted, defaults are
 * used. Returns active:false when the template has been disabled by an admin
 * (the caller should then skip sending).
 */
export function renderTemplate(
  key: TemplateKey,
  vars: Record<string, string | number | null | undefined>,
  overrides?: EmailTemplateOverrides,
): RenderedEmail {
  const def = DEFAULT_EMAIL_TEMPLATES[key];
  const ov = overrides?.[key];
  const active = ov?.is_active !== false;

  // Fall back to defaults if an override field is blank/invalid.
  const subjectTpl = (ov?.subject && ov.subject.trim()) || def.subject;
  const htmlTpl = (ov?.html_body && ov.html_body.trim()) || def.html_body;
  const textTpl = (ov?.text_body && ov.text_body.trim()) || def.text_body;

  return {
    subject: substitutePlain(subjectTpl, vars).trim(),
    html: baseLayout(substituteHtml(htmlTpl, vars)),
    text: substitutePlain(textTpl, vars),
    active,
  };
}
