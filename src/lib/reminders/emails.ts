/**
 * Reminder email builders. Each builder assembles a variable map (scalars +
 * server-generated HTML fragments) and renders it through the DB-backed
 * template layer (lib/reminders/email-templates). Admins can override any
 * template; when they haven't, the defaults there are used. All user/pet values
 * are HTML-escaped by the renderer.
 *
 * Builders accept an optional `overrides` map (loaded once by the caller) and
 * return { subject, html, text, active }. `active === false` means the admin
 * disabled that template and the caller should skip sending.
 */

import { BUSINESS, infoRow, primaryButton, escapeHtml as esc } from "@/lib/mailer";
import {
  renderTemplate,
  type EmailTemplateOverrides,
  type RenderedEmail,
} from "@/lib/reminders/email-templates";

export type Branding = {
  businessName: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
  replyTo: string;
  footerText: string;
  appUrl: string;
};

export type BuiltEmail = RenderedEmail;

export type PetEmailBase = {
  ownerName: string;
  petName: string;
  petPhotoUrl?: string | null;
  petProfileUrl: string;
  brand: Branding;
};

// ── Shared HTML fragment builders (RAW variables, injected unescaped) ─────────

function petPhotoBlock(photoUrl?: string | null): string {
  if (!photoUrl || !/^https?:\/\//i.test(photoUrl)) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:22px;"><tr><td align="center">
    <img src="${esc(photoUrl)}" alt="Pet photo" width="120" height="120" style="width:120px;height:120px;border-radius:16px;object-fit:cover;display:block;" />
  </td></tr></table>`;
}

function detailsTable(rows: [string, string | number | null | undefined][]): string {
  const inner = rows
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([label, value]) => infoRow(esc(label), esc(String(value))))
    .join("");
  if (!inner) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">${inner}</table>`;
}

function footerNote(brand: Branding): string {
  const parts = [
    brand.supportEmail ? `Email: <a href="mailto:${esc(brand.supportEmail)}" style="color:#EC4899;text-decoration:none;">${esc(brand.supportEmail)}</a>` : "",
    brand.supportPhone ? `Phone: ${esc(brand.supportPhone)}` : "",
  ].filter(Boolean).join("&nbsp;&nbsp;·&nbsp;&nbsp;");
  if (!parts && !brand.footerText) return "";
  return `<p style="margin:16px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">${parts}${brand.footerText ? `<br/>${esc(brand.footerText)}` : ""}</p>`;
}

function commonVars(d: PetEmailBase) {
  return {
    ownerName: d.ownerName,
    petName: d.petName,
    petProfileUrl: d.petProfileUrl,
    petPhotoUrl: d.petPhotoUrl || "",
    petPhotoBlock: petPhotoBlock(d.petPhotoUrl),
    businessName: d.brand.businessName,
    businessLogoUrl: d.brand.logoUrl,
    supportEmail: d.brand.supportEmail,
    supportPhone: d.brand.supportPhone,
    footerNote: footerNote(d.brand),
    currentYear: String(new Date().getFullYear()),
  };
}

// ── Birthday ─────────────────────────────────────────────────────────────────

export function birthdayReminderEmail(
  d: PetEmailBase & { birthdayDate: string; daysUntilBirthday: number; petAge: string },
  overrides?: EmailTemplateOverrides,
): BuiltEmail {
  const when = d.daysUntilBirthday <= 0 ? "today" : d.daysUntilBirthday === 1 ? "tomorrow" : `in ${d.daysUntilBirthday} days`;
  return renderTemplate("birthday", {
    ...commonVars(d),
    headerTitle: `${d.petName}'s birthday is almost here`,
    headerSubtitle: `A special day is coming ${when}.`,
    birthdayDate: d.birthdayDate,
    daysUntilBirthday: String(d.daysUntilBirthday),
    petAge: d.petAge,
    detailsTable: detailsTable([["Pet", d.petName], ["Birthday", d.birthdayDate], ["Current age", d.petAge]]),
    ctaButton: primaryButton(`View ${d.petName}'s profile`, d.petProfileUrl),
  }, overrides);
}

export function birthdayGreetingEmail(
  d: PetEmailBase & { petAge: string; birthdayDate?: string },
  overrides?: EmailTemplateOverrides,
): BuiltEmail {
  return renderTemplate("birthday_greeting", {
    ...commonVars(d),
    headerTitle: `Happy Birthday, ${d.petName}!`,
    headerSubtitle: "Warm wishes from all of us.",
    birthdayDate: d.birthdayDate || "",
    petAge: d.petAge,
    ctaButton: primaryButton(`View ${d.petName}'s profile`, d.petProfileUrl),
  }, overrides);
}

// ── Vaccination reminders ────────────────────────────────────────────────────

export type VaccinationVariant = "due_soon" | "due_today" | "overdue";

export function vaccinationReminderEmail(
  d: PetEmailBase & {
    variant: VaccinationVariant;
    vaccineName: string;
    administeredDate?: string | null;
    nextDueDate: string;
    daysUntilDue: number;
    daysOverdue: number;
    vetName?: string | null;
    vetContact?: string | null;
  },
  overrides?: EmailTemplateOverrides,
): BuiltEmail {
  const key = d.variant === "overdue" ? "vaccination_overdue" : d.variant === "due_today" ? "vaccination_due_today" : "vaccination_due_soon";
  const headerTitle = d.variant === "overdue"
    ? `${d.petName}'s ${d.vaccineName} is overdue`
    : d.variant === "due_today"
      ? `${d.petName}'s ${d.vaccineName} is due today`
      : `${d.petName}'s ${d.vaccineName} is due soon`;
  return renderTemplate(key, {
    ...commonVars(d),
    headerTitle,
    headerSubtitle: d.variant === "overdue" ? "Please arrange this at your earliest convenience." : "A gentle reminder for your pet's health record.",
    vaccineName: d.vaccineName,
    administeredDate: d.administeredDate || "",
    nextDueDate: d.nextDueDate,
    daysUntilDue: String(Math.max(0, d.daysUntilDue)),
    daysOverdue: String(d.daysOverdue),
    vetName: d.vetName || "",
    vetContact: d.vetContact || "",
    detailsTable: detailsTable([
      ["Vaccine / treatment", d.vaccineName],
      ["Last administered", d.administeredDate || ""],
      ["Due date", d.nextDueDate],
      d.variant === "overdue" ? ["Overdue by", `${d.daysOverdue} day(s)`] : ["Days remaining", String(Math.max(0, d.daysUntilDue))],
      ["Veterinarian", d.vetName || ""],
      ["Vet contact", d.vetContact || ""],
    ]),
    ctaButton: primaryButton("View vaccination details", d.petProfileUrl),
  }, overrides);
}

// ── Confirmations ────────────────────────────────────────────────────────────

export function vaccinationUpdatedEmail(
  d: PetEmailBase & { vaccineName: string; nextDueDate: string; completed: boolean; administeredDate?: string | null },
  overrides?: EmailTemplateOverrides,
): BuiltEmail {
  const key = d.completed ? "vaccination_completed" : "vaccination_updated";
  return renderTemplate(key, {
    ...commonVars(d),
    headerTitle: d.completed ? `${d.vaccineName} recorded` : `${d.vaccineName} updated`,
    headerSubtitle: "Your pet's health record is up to date.",
    vaccineName: d.vaccineName,
    administeredDate: d.administeredDate || "",
    administeredSuffix: d.administeredDate ? ` on ${d.administeredDate}` : "",
    nextDueDate: d.nextDueDate,
    detailsTable: detailsTable([
      ["Vaccine / treatment", d.vaccineName],
      ["Administered", d.administeredDate || ""],
      ["Next due", d.nextDueDate],
    ]),
    ctaButton: primaryButton("View vaccination details", d.petProfileUrl),
  }, overrides);
}

// ── Admin summary ────────────────────────────────────────────────────────────

export function adminSummaryEmail(
  d: {
    brand: Branding;
    dateLabel: string;
    birthdaysToday: number;
    birthdaysNext7: number;
    vaccinationsDueToday: number;
    vaccinationsNext7: number;
    vaccinationsOverdue: number;
    sent: number;
    failed: number;
    skipped: number;
  },
  overrides?: EmailTemplateOverrides,
): BuiltEmail {
  return renderTemplate("admin_summary", {
    dateLabel: d.dateLabel,
    businessName: d.brand.businessName,
    headerTitle: "Daily reminder summary",
    headerSubtitle: d.dateLabel,
    birthdaysToday: String(d.birthdaysToday),
    birthdaysNext7: String(d.birthdaysNext7),
    vaccinationsDueToday: String(d.vaccinationsDueToday),
    vaccinationsNext7: String(d.vaccinationsNext7),
    vaccinationsOverdue: String(d.vaccinationsOverdue),
    sent: String(d.sent),
    skipped: String(d.skipped),
    failed: String(d.failed),
    summaryTable: detailsTable([
      ["Birthdays today", d.birthdaysToday],
      ["Birthdays (next 7 days)", d.birthdaysNext7],
      ["Vaccinations due today", d.vaccinationsDueToday],
      ["Vaccinations (next 7 days)", d.vaccinationsNext7],
      ["Overdue vaccinations", d.vaccinationsOverdue],
      ["Emails sent", d.sent],
      ["Skipped", d.skipped],
      ["Failed", d.failed],
    ]),
    ctaButton: primaryButton("Open admin reminders", `${d.brand.appUrl}/admin/reminders`),
  }, overrides);
}

// ── Delivery failure alert ───────────────────────────────────────────────────

export function deliveryFailureEmail(
  d: { brand: Branding; reminderType: string; recipient: string; petName: string; ownerName: string; errorMessage: string },
  overrides?: EmailTemplateOverrides,
): BuiltEmail {
  return renderTemplate("delivery_failure", {
    reminderType: d.reminderType,
    recipient: d.recipient,
    petName: d.petName,
    ownerName: d.ownerName,
    businessName: d.brand.businessName,
    errorMessage: d.errorMessage,
    headerTitle: "Reminder delivery failed",
    headerSubtitle: "A reminder email needs attention.",
    detailsTable: detailsTable([
      ["Reminder type", d.reminderType],
      ["Recipient", d.recipient],
      ["Pet", d.petName],
      ["Owner", d.ownerName],
    ]),
    ctaButton: primaryButton("Open admin reminders", `${d.brand.appUrl}/admin/reminders`),
  }, overrides);
}

// ── Sample rendering (for the admin template editor preview / test) ──────────

const SAMPLE_BRANDING: Branding = {
  businessName: "Pupparazzi Club",
  logoUrl: "",
  supportEmail: "support@pupparazziclub.in",
  supportPhone: "063588 48177",
  replyTo: "support@pupparazziclub.in",
  footerText: "",
  appUrl: "https://pupparazziclub.in",
};

const SAMPLE_BASE: PetEmailBase = {
  ownerName: "Priya Sharma",
  petName: "Bruno",
  petPhotoUrl: null,
  petProfileUrl: "https://pupparazziclub.in/dashboard/pets",
  brand: SAMPLE_BRANDING,
};

/** Render a template with representative sample data (used by preview + test send). */
export function renderSampleForKey(
  key:
    | "birthday" | "birthday_greeting" | "vaccination_due_soon" | "vaccination_due_today"
    | "vaccination_overdue" | "vaccination_updated" | "vaccination_completed"
    | "admin_summary" | "delivery_failure",
  overrides?: EmailTemplateOverrides,
): BuiltEmail {
  switch (key) {
    case "birthday":
      return birthdayReminderEmail({ ...SAMPLE_BASE, birthdayDate: "06 May 2026", daysUntilBirthday: 7, petAge: "3 years" }, overrides);
    case "birthday_greeting":
      return birthdayGreetingEmail({ ...SAMPLE_BASE, petAge: "3 years", birthdayDate: "06 May 2026" }, overrides);
    case "vaccination_due_soon":
      return vaccinationReminderEmail({ ...SAMPLE_BASE, variant: "due_soon", vaccineName: "Anti Rabies", administeredDate: "06 May 2025", nextDueDate: "06 May 2026", daysUntilDue: 7, daysOverdue: 0, vetName: "Dr. Mehta", vetContact: "098765 43210" }, overrides);
    case "vaccination_due_today":
      return vaccinationReminderEmail({ ...SAMPLE_BASE, variant: "due_today", vaccineName: "DHPPiL", administeredDate: "01 Jan 2025", nextDueDate: "01 Jan 2026", daysUntilDue: 0, daysOverdue: 0, vetName: "Dr. Mehta", vetContact: "098765 43210" }, overrides);
    case "vaccination_overdue":
      return vaccinationReminderEmail({ ...SAMPLE_BASE, variant: "overdue", vaccineName: "Deworming", administeredDate: "01 Jan 2025", nextDueDate: "01 Apr 2025", daysUntilDue: 0, daysOverdue: 12, vetName: "Dr. Mehta", vetContact: "098765 43210" }, overrides);
    case "vaccination_updated":
      return vaccinationUpdatedEmail({ ...SAMPLE_BASE, vaccineName: "Corona", nextDueDate: "01 Jun 2026", completed: false, administeredDate: "01 Jun 2025" }, overrides);
    case "vaccination_completed":
      return vaccinationUpdatedEmail({ ...SAMPLE_BASE, vaccineName: "Corona", nextDueDate: "01 Jun 2026", completed: true, administeredDate: "01 Jun 2025" }, overrides);
    case "admin_summary":
      return adminSummaryEmail({ brand: SAMPLE_BRANDING, dateLabel: "15 Jul 2026", birthdaysToday: 2, birthdaysNext7: 5, vaccinationsDueToday: 3, vaccinationsNext7: 9, vaccinationsOverdue: 1, sent: 12, failed: 1, skipped: 2 }, overrides);
    case "delivery_failure":
      return deliveryFailureEmail({ brand: SAMPLE_BRANDING, reminderType: "vaccination_due_soon", recipient: "priya@example.com", petName: "Bruno", ownerName: "Priya Sharma", errorMessage: "SMTP connection timed out" }, overrides);
  }
}

/** Default branding fallback derived from the hardcoded BUSINESS constant. */
export function businessFallbackBranding(appUrl: string): Branding {
  return {
    businessName: BUSINESS.name,
    logoUrl: BUSINESS.logo,
    supportEmail: BUSINESS.email,
    supportPhone: "",
    replyTo: BUSINESS.email,
    footerText: "",
    appUrl,
  };
}
