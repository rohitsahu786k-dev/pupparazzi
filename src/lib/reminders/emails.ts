/**
 * Reminder email templates. These reuse the branded baseLayout + helpers from
 * lib/mailer.ts so every message shares the app's look, single transport and
 * footer. All user-supplied values are escaped before interpolation.
 *
 * Each builder returns { subject, html, text } — an HTML version plus a
 * plain-text fallback. Optional fields degrade gracefully (missing vet, photo…).
 */

import {
  BUSINESS,
  baseLayout,
  infoRow,
  primaryButton,
  sectionTitle,
  escapeHtml as esc,
} from "@/lib/mailer";

export type Branding = {
  businessName: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone: string;
  replyTo: string;
  footerText: string;
  appUrl: string;
};

export type BuiltEmail = { subject: string; html: string; text: string };

function petPhotoBlock(photoUrl?: string | null): string {
  if (!photoUrl || !/^https?:\/\//i.test(photoUrl)) return "";
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
    <tr><td align="center">
      <img src="${esc(photoUrl)}" alt="Pet photo" width="120" height="120" style="width:120px;height:120px;border-radius:16px;object-fit:cover;display:block;" />
    </td></tr>
  </table>`;
}

function greetingHeader(title: string, subtitle: string, band = "#0F172A 0%,#1E293B 100%"): string {
  return `
    <div style="background:linear-gradient(135deg,${band});padding:36px 48px 32px;text-align:center;">
      <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#FFFFFF;line-height:1.25;">${title}</h1>
      <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.72);line-height:1.6;">${subtitle}</p>
    </div>`;
}

function footerNote(brand: Branding): string {
  const parts = [
    brand.supportEmail ? `Email: <a href="mailto:${esc(brand.supportEmail)}" style="color:#EC4899;text-decoration:none;">${esc(brand.supportEmail)}</a>` : "",
    brand.supportPhone ? `Phone: ${esc(brand.supportPhone)}` : "",
  ].filter(Boolean).join("&nbsp;&nbsp;·&nbsp;&nbsp;");
  return `<p style="margin:16px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">${parts}${brand.footerText ? `<br/>${esc(brand.footerText)}` : ""}</p>`;
}

// ── Common inputs ────────────────────────────────────────────────────────────

export type PetEmailBase = {
  ownerName: string;
  petName: string;
  petPhotoUrl?: string | null;
  petProfileUrl: string;
  brand: Branding;
};

// ── Birthday reminder (upcoming) ─────────────────────────────────────────────

export function birthdayReminderEmail(d: PetEmailBase & {
  birthdayDate: string;
  daysUntilBirthday: number;
  petAge: string;
}): BuiltEmail {
  const when = d.daysUntilBirthday <= 0 ? "today" : d.daysUntilBirthday === 1 ? "tomorrow" : `in ${d.daysUntilBirthday} days`;
  const subject = `${d.petName}'s birthday is coming up`;
  const body = `
    ${greetingHeader(`${esc(d.petName)}'s birthday is almost here`, `A special day is coming ${when}.`)}
    <div style="padding:36px 48px;" class="email-card">
      ${petPhotoBlock(d.petPhotoUrl)}
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">Hello <strong style="color:#0F172A;">${esc(d.ownerName)}</strong>,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">A special day is almost here. <strong>${esc(d.petName)}</strong> will be celebrating a birthday on <strong>${esc(d.birthdayDate)}</strong>. We hope the day is filled with happy moments, favourite treats and plenty of love.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
        ${infoRow("Pet", esc(d.petName))}
        ${infoRow("Birthday", esc(d.birthdayDate))}
        ${d.petAge ? infoRow("Current age", esc(d.petAge)) : ""}
      </table>
      ${primaryButton(`View ${esc(d.petName)}'s profile`, d.petProfileUrl)}
      ${footerNote(d.brand)}
    </div>`;
  return {
    subject,
    html: baseLayout(body, `${d.petName}'s birthday is ${when} — ${d.birthdayDate}`),
    text: `Hello ${d.ownerName},\n\n${d.petName} will be celebrating a birthday on ${d.birthdayDate} (${when}).\n\nView profile: ${d.petProfileUrl}\n\nWarm regards,\n${d.brand.businessName}`,
  };
}

// ── Birthday greeting (on the day) ───────────────────────────────────────────

export function birthdayGreetingEmail(d: PetEmailBase & { petAge: string }): BuiltEmail {
  const subject = `Happy Birthday, ${d.petName}!`;
  const body = `
    ${greetingHeader(`Happy Birthday, ${esc(d.petName)}!`, `Warm wishes from all of us.`, "#BE185D 0%,#EA580C 100%")}
    <div style="padding:36px 48px;" class="email-card">
      ${petPhotoBlock(d.petPhotoUrl)}
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">Hello <strong style="color:#0F172A;">${esc(d.ownerName)}</strong>,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Everyone at ${esc(d.brand.businessName)} wishes <strong>${esc(d.petName)}</strong> a very happy birthday. May the year ahead bring good health, joyful walks, delicious treats and many memorable moments together.</p>
      ${primaryButton(`View ${esc(d.petName)}'s profile`, d.petProfileUrl)}
      ${footerNote(d.brand)}
    </div>`;
  return {
    subject,
    html: baseLayout(body, `Happy Birthday, ${d.petName}!`),
    text: `Hello ${d.ownerName},\n\nEveryone at ${d.brand.businessName} wishes ${d.petName} a very happy birthday!\n\n${d.petProfileUrl}\n\nWarm wishes,\n${d.brand.businessName}`,
  };
}

// ── Vaccination reminder (due soon / due today / overdue) ─────────────────────

export type VaccinationVariant = "due_soon" | "due_today" | "overdue";

export function vaccinationReminderEmail(d: PetEmailBase & {
  variant: VaccinationVariant;
  vaccineName: string;
  administeredDate?: string | null;
  nextDueDate: string;
  daysUntilDue: number;
  daysOverdue: number;
  vetName?: string | null;
  vetContact?: string | null;
}): BuiltEmail {
  const isOverdue = d.variant === "overdue";
  const isToday = d.variant === "due_today";
  const band = isOverdue ? "#7F1D1D 0%,#B91C1C 100%" : isToday ? "#C2410C 0%,#EA580C 100%" : "#0F172A 0%,#1E293B 100%";
  const subject = isOverdue
    ? `Action required: ${d.petName}'s ${d.vaccineName} is overdue`
    : `Vaccination reminder for ${d.petName} - ${d.vaccineName}`;
  const headline = isOverdue
    ? `${esc(d.petName)}'s ${esc(d.vaccineName)} is overdue`
    : isToday
      ? `${esc(d.petName)}'s ${esc(d.vaccineName)} is due today`
      : `${esc(d.petName)}'s ${esc(d.vaccineName)} is due soon`;
  const intro = isOverdue
    ? `Our records indicate that <strong>${esc(d.petName)}</strong>'s <strong>${esc(d.vaccineName)}</strong> was due on <strong>${esc(d.nextDueDate)}</strong> and is currently <strong>${d.daysOverdue} day${d.daysOverdue === 1 ? "" : "s"}</strong> overdue. Please contact your veterinarian and update the record after completion.`
    : `This is a friendly reminder that <strong>${esc(d.petName)}</strong>'s <strong>${esc(d.vaccineName)}</strong> is due on <strong>${esc(d.nextDueDate)}</strong>. Keeping vaccination information up to date helps maintain a reliable health record for your pet.`;

  const body = `
    ${greetingHeader(headline, isOverdue ? "Please arrange this at your earliest convenience." : "A gentle reminder for your pet's health record.", band)}
    <div style="padding:36px 48px;" class="email-card">
      ${petPhotoBlock(d.petPhotoUrl)}
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">Hello <strong style="color:#0F172A;">${esc(d.ownerName)}</strong>,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">${intro}</p>
      ${sectionTitle("Details")}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
        ${infoRow("Vaccine / treatment", esc(d.vaccineName))}
        ${d.administeredDate ? infoRow("Last administered", esc(d.administeredDate)) : ""}
        ${infoRow("Due date", esc(d.nextDueDate))}
        ${isOverdue ? infoRow("Overdue by", `${d.daysOverdue} day${d.daysOverdue === 1 ? "" : "s"}`) : infoRow("Days remaining", `${Math.max(0, d.daysUntilDue)}`)}
        ${d.vetName ? infoRow("Veterinarian", esc(d.vetName)) : ""}
        ${d.vetContact ? infoRow("Vet contact", esc(d.vetContact)) : ""}
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0 8px;">
        <tr><td style="background:#FFF7ED;border-left:4px solid #F97316;border-radius:0 12px 12px 0;padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#B45309;line-height:1.6;">Please contact your veterinarian to arrange the required appointment, then update the record so future reminders stay accurate.</p>
        </td></tr>
      </table>
      ${primaryButton("View vaccination details", d.petProfileUrl)}
      ${footerNote(d.brand)}
    </div>`;

  const text = `Hello ${d.ownerName},\n\n${d.petName}'s ${d.vaccineName} ${isOverdue ? `was due on ${d.nextDueDate} and is ${d.daysOverdue} day(s) overdue` : `is due on ${d.nextDueDate}`}.\n${d.vetName ? `Veterinarian: ${d.vetName}${d.vetContact ? ` (${d.vetContact})` : ""}\n` : ""}\nView details: ${d.petProfileUrl}\n\nRegards,\n${d.brand.businessName}`;

  return { subject, html: baseLayout(body, subject), text };
}

// ── Vaccination updated / completed confirmations ────────────────────────────

export function vaccinationUpdatedEmail(d: PetEmailBase & {
  vaccineName: string;
  nextDueDate: string;
  completed: boolean;
  administeredDate?: string | null;
}): BuiltEmail {
  const subject = d.completed
    ? `${d.vaccineName} marked complete for ${d.petName}`
    : `${d.vaccineName} updated for ${d.petName}`;
  const body = `
    ${greetingHeader(d.completed ? `${esc(d.vaccineName)} recorded` : `${esc(d.vaccineName)} updated`, `Your pet's health record is up to date.`, "#065F46 0%,#047857 100%")}
    <div style="padding:36px 48px;" class="email-card">
      <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.7;">Hello <strong style="color:#0F172A;">${esc(d.ownerName)}</strong>,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">We've ${d.completed ? "recorded" : "updated"} <strong>${esc(d.vaccineName)}</strong> for <strong>${esc(d.petName)}</strong>. The next reminder will be based on the due date below.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
        ${infoRow("Vaccine / treatment", esc(d.vaccineName))}
        ${d.administeredDate ? infoRow("Administered", esc(d.administeredDate)) : ""}
        ${infoRow("Next due", esc(d.nextDueDate))}
      </table>
      ${primaryButton("View vaccination details", d.petProfileUrl)}
      ${footerNote(d.brand)}
    </div>`;
  return {
    subject,
    html: baseLayout(body, subject),
    text: `Hello ${d.ownerName},\n\n${d.vaccineName} for ${d.petName} has been ${d.completed ? "recorded" : "updated"}. Next due: ${d.nextDueDate}.\n\n${d.petProfileUrl}\n\nRegards,\n${d.brand.businessName}`,
  };
}

// ── Admin daily summary ──────────────────────────────────────────────────────

export function adminSummaryEmail(d: {
  brand: Branding;
  dateLabel: string;
  birthdayCount: number;
  vaccinationDueCount: number;
  overdueCount: number;
  sent: number;
  failed: number;
  skipped: number;
}): BuiltEmail {
  const subject = `Reminder summary — ${d.dateLabel}`;
  const body = `
    ${greetingHeader("Daily reminder summary", d.dateLabel)}
    <div style="padding:36px 48px;" class="email-card">
      ${sectionTitle("Today's activity")}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
        ${infoRow("Birthdays today", String(d.birthdayCount))}
        ${infoRow("Vaccinations due", String(d.vaccinationDueCount))}
        ${infoRow("Overdue vaccinations", String(d.overdueCount))}
        ${infoRow("Emails sent", String(d.sent))}
        ${infoRow("Skipped", String(d.skipped))}
        ${infoRow("Failed", String(d.failed))}
      </table>
      ${primaryButton("Open admin reminders", `${d.brand.appUrl}/admin/reminders`)}
    </div>`;
  return {
    subject,
    html: baseLayout(body, subject),
    text: `Reminder summary for ${d.dateLabel}\nBirthdays: ${d.birthdayCount}\nVaccinations due: ${d.vaccinationDueCount}\nOverdue: ${d.overdueCount}\nSent: ${d.sent}, Skipped: ${d.skipped}, Failed: ${d.failed}`,
  };
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
