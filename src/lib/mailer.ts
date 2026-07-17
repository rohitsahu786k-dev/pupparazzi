import nodemailer from "nodemailer";
import { DEFAULT_SMTP_SETTINGS, getSetting } from "@/lib/settings";
import { BUSINESS_ADDRESS } from "@/lib/homepage-content";
import { SITE_URL } from "@/lib/booking-detail-forms";
import { prisma } from "@/lib/prisma";
import { CouponRule, defaultCoupons } from "@/lib/pet-care-pricing";

export const BUSINESS = {
  name: "Pupparazzi Pet Store & Grooming Salon",
  shortName: "Pupparazzi",
  email: "pupparazzipetstore@gmail.com",
  address: BUSINESS_ADDRESS,
  gst: "24AAXFP9081F1ZN",
  website: SITE_URL,
  get logo() {
    return `${this.website}/pupparazzi-logo.png`;
  },
};

// ── Reusable HTML helpers ────────────────────────────────────────

/** Escape user-supplied values before interpolating into email HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function statusBadge(label: string, bg: string, color: string) {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:5px 14px;border-radius:100px;">${label}</span>`;
}

export function infoRow(label: string, value: string) {
  return `
  <tr>
    <td style="padding:12px 0;border-bottom:1px solid #F1F5F9;font-size:13px;color:#64748B;font-weight:500;width:40%;vertical-align:top;">${label}</td>
    <td style="padding:12px 0;border-bottom:1px solid #F1F5F9;font-size:13px;color:#0F172A;font-weight:600;vertical-align:top;text-align:right;">${value}</td>
  </tr>`;
}

export function primaryButton(label: string, url: string) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:32px 0;">
    <tr>
      <td align="center">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#EC4899 0%,#F97316 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:100px;letter-spacing:0.02em;mso-padding-alt:14px 40px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function sectionTitle(text: string) {
  return `<h2 style="margin:0 0 20px;font-size:13px;font-weight:700;color:#94A3B8;letter-spacing:0.12em;text-transform:uppercase;">${text}</h2>`;
}

async function welcomeEmailCoupon() {
  const setting = await prisma.appSetting.findUnique({ where: { key: "coupons" } });
  const coupons = (Array.isArray(setting?.value) ? setting.value : defaultCoupons) as CouponRule[];
  const now = new Date();
  return coupons.find((coupon) => (
    coupon.send_in_welcome_email
    && coupon.is_active
    && (!coupon.expires_at || new Date(coupon.expires_at) >= now)
  )) || coupons.find((coupon) => coupon.is_active && (!coupon.expires_at || new Date(coupon.expires_at) >= now)) || null;
}

function couponOfferLine(coupon: CouponRule) {
  const value = coupon.discount_type === "FLAT"
    ? `Rs. ${Number(coupon.discount_value || 0).toLocaleString("en-IN")} OFF`
    : `${Number(coupon.discount_value || 0).toLocaleString("en-IN")}% OFF`;
  const category = coupon.category ? ` on ${coupon.category.toLowerCase()} services` : "";
  return `${value}${category}`;
}

// ── Base Layout ─────────────────────────────────────────────────

export function baseLayout(body: string, preheader = "") {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${BUSINESS.name}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body { margin: 0; padding: 0; background-color: #F1F5F9; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse; }
    @media only screen and (max-width: 620px) {
      .email-wrapper { width: 100% !important; padding: 12px !important; }
      .email-card { padding: 28px 20px !important; }
      .stats-cell { display: block !important; width: 100% !important; text-align: center !important; padding: 12px 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#F1F5F9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}

  <!-- Wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:40px 20px;" class="email-wrapper">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <img src="${BUSINESS.logo}" alt="${BUSINESS.shortName}" width="160" height="48" style="height:48px;width:auto;object-fit:contain;display:block;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 2px 40px rgba(15,23,42,0.08);">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:36px 0 20px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#475569;">${BUSINESS.name}</p>
              <p style="margin:0 0 6px;font-size:11px;color:#94A3B8;line-height:1.6;max-width:480px;margin-left:auto;margin-right:auto;">${BUSINESS.address}</p>
              <p style="margin:0 0 16px;font-size:11px;color:#94A3B8;">
                GSTIN: ${BUSINESS.gst}&nbsp;&nbsp;·&nbsp;&nbsp;<a href="mailto:${BUSINESS.email}" style="color:#EC4899;text-decoration:none;">${BUSINESS.email}</a>
              </p>
              <p style="margin:0;font-size:10px;color:#CBD5E1;">© ${year} ${BUSINESS.name}. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 1 – BOOKING CONFIRMATION
// ═══════════════════════════════════════════════════════════════

export function bookingConfirmationHtml(data: {
  userName: string;
  bookingDatabaseId?: string;
  bookingId: string;
  serviceName: string;
  serviceCategory?: string;
  petName: string;
  slotDate: string;
  slotTime: string;
  price: string;
  address?: string;
  detailFormLink?: string | null;
  detailFormService?: string | null;
}) {
  const detailFormName = data.detailFormService || data.serviceCategory || data.serviceName;
  const hasDetailForm = Boolean(data.detailFormLink);
  const body = `
    <!-- Header Band -->
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:36px 48px 32px;text-align:center;">
      <div style="display:inline-block;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:100px;padding:6px 18px;margin-bottom:20px;">
        <span style="color:#10B981;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;"> Booking Confirmed</span>
      </div>
      <h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#FFFFFF;line-height:1.2;">${hasDetailForm ? `Complete your ${detailFormName} details` : `You&rsquo;re all set, ${data.userName}!`}</h1>
      <p style="margin:0;font-size:15px;color:#94A3B8;line-height:1.6;">${hasDetailForm ? "Your booking has been created. Please complete the remaining form details before the appointment." : "Your appointment has been confirmed. We&rsquo;ll see you soon!"}</p>
    </div>

    <!-- Body -->
    <div style="padding:40px 48px;" class="email-card">

      <!-- Booking Reference Card -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
        <tr>
          <td style="background:linear-gradient(135deg,#EC4899 0%,#F97316 100%);border-radius:16px;padding:24px 28px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:0.12em;text-transform:uppercase;">Booking Reference</p>
            <p style="margin:0 0 4px;font-size:28px;font-weight:800;color:#FFFFFF;letter-spacing:0.05em;">${data.bookingId}</p>
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.7);">Keep this for your records</p>
          </td>
        </tr>
      </table>

      <!-- Details -->
      ${sectionTitle("Appointment Details")}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
        ${infoRow("Service", data.serviceName)}
        ${infoRow("Pet Name", data.petName)}
        ${infoRow("Date", data.slotDate)}
        ${infoRow("Time", data.slotTime)}
        ${data.address ? infoRow("Location", data.address) : ""}
        ${infoRow("Amount", `₹${data.price}`)}
      </table>

      ${hasDetailForm ? `
      <!-- Detail Form Box -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="background:#FDF2F8;border-left:4px solid #EC4899;border-radius:0 12px 12px 0;padding:16px 20px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#9D174D;">Complete Your ${detailFormName} Booking Details</p>
            <p style="margin:0;font-size:13px;color:#BE185D;line-height:1.6;">Some customer, pet, service, and booking details may already be pre-filled. Kindly complete the remaining details and upload the required documents.</p>
          </td>
        </tr>
      </table>

      ${primaryButton(`Complete ${detailFormName} Details`, data.detailFormLink || `${BUSINESS.website}/dashboard`)}
      ` : `
      <!-- Reminder Box -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="background:#FFF7ED;border-left:4px solid #F97316;border-radius:0 12px 12px 0;padding:16px 20px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400E;">Important Reminder</p>
            <p style="margin:0;font-size:13px;color:#B45309;line-height:1.6;">Please ensure your pet is ready at the scheduled time. For changes or cancellations, contact us at least <strong>24 hours in advance</strong>.</p>
          </td>
        </tr>
      </table>

      ${primaryButton("View My Bookings", `${BUSINESS.website}/dashboard`)}
      `}

      <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">Questions? Reply to this email or write to us at <a href="mailto:${BUSINESS.email}" style="color:#EC4899;text-decoration:none;">${BUSINESS.email}</a></p>
    </div>`;

  return baseLayout(
    body,
    hasDetailForm
      ? `Complete your ${detailFormName} booking details for ${data.bookingId}`
      : `Your booking ${data.bookingId} is confirmed - ${data.serviceName} on ${data.slotDate}`
  );
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 2 – PAYMENT CONFIRMATION (with invoice attachment)
// ═══════════════════════════════════════════════════════════════

export function paymentConfirmationHtml(data: {
  userName: string;
  bookingId: string;
  invoiceNumber: string;
  serviceName: string;
  petName: string;
  slotDate: string;
  slotTime: string;
  subtotal: string;
  gstAmount: string;
  totalAmount: string;
  paymentMethod: string;
  transactionId?: string;
}) {
  const body = `
    <!-- Header Band -->
    <div style="background:linear-gradient(135deg,#064E3B 0%,#065F46 100%);padding:36px 48px 32px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(16,185,129,0.2);border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
        <div style="width:20px;height:20px;border:2px solid #10B981;border-top:none;border-left:none;transform:rotate(45deg);"></div>
      </div>
      <h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#FFFFFF;line-height:1.2;">Payment Successful</h1>
      <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.6;">Thank you, ${data.userName}. Your payment of <strong style="color:#FFFFFF;">₹${data.totalAmount}</strong> has been received.</p>
      ${statusBadge(" Payment Confirmed", "rgba(16,185,129,0.2)", "#10B981")}
    </div>

    <!-- Body -->
    <div style="padding:40px 48px;" class="email-card">

      <!-- Invoice Alert -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
        <tr>
          <td style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;padding:20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="48" valign="middle" style="padding-right:16px;">
                  <div style="width:44px;height:44px;background:#DCFCE7;border-radius:10px;text-align:center;line-height:44px;font-size:22px;"></div>
                </td>
                <td valign="middle">
                  <p style="margin:0 0 3px;font-size:14px;font-weight:700;color:#15803D;">GST Invoice Attached</p>
                  <p style="margin:0;font-size:12px;color:#16A34A;">Invoice <strong>${data.invoiceNumber}</strong> is attached as a PDF to this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Transaction Summary -->
      ${sectionTitle("Transaction Summary")}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
        ${infoRow("Invoice No.", data.invoiceNumber)}
        ${infoRow("Booking ID", data.bookingId)}
        ${infoRow("Service", data.serviceName)}
        ${infoRow("Pet", data.petName)}
        ${infoRow("Appointment", `${data.slotDate} at ${data.slotTime}`)}
        ${infoRow("Payment Method", data.paymentMethod)}
        ${data.transactionId ? infoRow("Transaction ID", data.transactionId) : ""}
      </table>

      <!-- Amount Breakdown -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F8FAFC;border-radius:14px;overflow:hidden;margin:24px 0;">
        <tr>
          <td style="padding:20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="font-size:13px;color:#64748B;padding-bottom:10px;">Subtotal</td>
                <td style="font-size:13px;color:#0F172A;font-weight:600;text-align:right;padding-bottom:10px;">₹${data.subtotal}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748B;padding-bottom:10px;">CGST (9%)</td>
                <td style="font-size:13px;color:#0F172A;font-weight:600;text-align:right;padding-bottom:10px;">₹${(parseFloat(data.gstAmount) / 2).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748B;padding-bottom:16px;">SGST (9%)</td>
                <td style="font-size:13px;color:#0F172A;font-weight:600;text-align:right;padding-bottom:16px;">₹${(parseFloat(data.gstAmount) / 2).toFixed(2)}</td>
              </tr>
              <tr style="border-top:2px solid #E2E8F0;">
                <td style="font-size:16px;font-weight:800;color:#0F172A;padding-top:16px;">Total Paid</td>
                <td style="font-size:20px;font-weight:800;color:#EC4899;text-align:right;padding-top:16px;">₹${data.totalAmount}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      ${primaryButton("View My Dashboard", `${BUSINESS.website}/dashboard`)}

      <p style="margin:0;font-size:11px;color:#94A3B8;text-align:center;line-height:1.6;">This is a system-generated receipt. For any discrepancies, contact us at <a href="mailto:${BUSINESS.email}" style="color:#EC4899;text-decoration:none;">${BUSINESS.email}</a></p>
    </div>`;

  return baseLayout(body, `Payment of ₹${data.totalAmount} confirmed – Invoice ${data.invoiceNumber} attached`);
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 3 – WELCOME EMAIL
// ═══════════════════════════════════════════════════════════════

export function welcomeEmailHtml(data: { userName: string; email: string; password?: string; role?: "CLIENT" | "STAFF" | "ADMIN"; welcomeCoupon?: CouponRule | null }) {
  const role = data.role || "CLIENT";
  const portalUrl = role === "ADMIN" ? `${BUSINESS.website}/admin` : role === "STAFF" ? `${BUSINESS.website}/staff` : `${BUSINESS.website}/dashboard`;
  const roleTitle = role === "ADMIN" ? "Admin" : role === "STAFF" ? "Staff" : "Client";
  const services = [
    { icon: "", name: "Premium Grooming", desc: "Certified groomers, spa treatments" },
    { icon: "", name: "Luxury Boarding", desc: "Climate-controlled, 24/7 care" },
    { icon: "", name: "Boarding Packages", desc: "Flexible prepaid stay packages" },
    { icon: "", name: "Individual Grooming", desc: "Focused add-on grooming care" },
  ];
  const profileFields = [
    "Profile details: name, email, mobile number, and service address",
    "Pet details: name, breed, gender, age/date of birth, weight, coat type, and size",
    "Health details: vaccination status, allergies, medication, illness history, and vet contact",
    "Care details: guardian contact, dietary preference, walk or feeding schedule, and behavior notes",
  ];

  const body = `
    <!-- Header Band -->
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:40px 48px;text-align:center;">
      <div style="font-size:52px;margin-bottom:16px;"></div>
      <h1 style="margin:0 0 10px;font-size:30px;font-weight:800;color:#FFFFFF;line-height:1.2;">Welcome to Pupparazzi!</h1>
      <p style="margin:0;font-size:16px;color:#94A3B8;">Your ${roleTitle} account is ready</p>
    </div>

    <!-- Body -->
    <div style="padding:40px 48px;" class="email-card">
      <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.7;">Hi <strong style="color:#0F172A;">${data.userName}</strong> ,</p>
      ${data.password ? `
      <!-- Credentials Box -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="background:#F8FAFC;border-left:4px solid #EC4899;border-radius:0 12px 12px 0;padding:16px 20px;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0F172A;">Your Login Credentials</p>
            <p style="margin:0 0 4px;font-size:13px;color:#475569;">Email/Username: <strong style="color:#0F172A;">${data.email}</strong></p>
            <p style="margin:0 0 12px;font-size:13px;color:#475569;">Password: <strong style="color:#0F172A;">${data.password}</strong></p>
            <p style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Please use these credentials to log in. We recommend changing your password after logging in for the first time.</p>
          </td>
        </tr>
      </table>
      ` : ""}
      ${role === "CLIENT" ? `
      <p style="margin:0 0 22px;font-size:15px;color:#475569;line-height:1.7;">Your Pupparazzi profile can now hold multiple pets, booking history, documents, addresses, and service notes. Please keep these details updated so our team can care for every pet safely.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        ${profileFields.map((field) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:13px;color:#0F172A;font-weight:600;line-height:1.5;">${field}</td>
          </tr>
        `).join("")}
      </table>
      <p style="margin:0 0 32px;font-size:15px;color:#475569;line-height:1.7;">Here are the care options available from your client portal:</p>

      <!-- Services Grid -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
        ${services.map((s, i) => i % 2 === 0 ? `
        <tr>
          <td width="50%" style="padding:0 8px 12px 0;vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="background:#F8FAFC;border:1px solid #F1F5F9;border-radius:12px;padding:16px 18px;">
                  <p style="margin:0 0 4px;font-size:20px;">${s.icon}</p>
                  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0F172A;">${s.name}</p>
                  <p style="margin:0;font-size:12px;color:#64748B;">${s.desc}</p>
                </td>
              </tr>
            </table>
          </td>
          <td width="50%" style="padding:0 0 12px 8px;vertical-align:top;">
            ${services[i + 1] ? `
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="background:#F8FAFC;border:1px solid #F1F5F9;border-radius:12px;padding:16px 18px;">
                  <p style="margin:0 0 4px;font-size:20px;">${services[i + 1].icon}</p>
                  <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0F172A;">${services[i + 1].name}</p>
                  <p style="margin:0;font-size:12px;color:#64748B;">${services[i + 1].desc}</p>
                </td>
              </tr>
            </table>` : ""}
          </td>
        </tr>` : "").filter(Boolean).join("")}
      </table>
      ` : `
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">You have been assigned ${roleTitle} access. Please use the portal for your assigned responsibilities only.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        ${[
          role === "ADMIN" ? "Manage services, pricing, staff, clients, bookings, payments, settings, and reports." : "Manage assigned booking progress, service notes, and customer handoff updates.",
          role === "ADMIN" ? "Review operational dashboards and system configuration." : "Pricing, services, products, client records, payments, and admin settings are restricted.",
          "Keep your password private and sign out on shared devices.",
        ].map((field) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:13px;color:#0F172A;font-weight:600;line-height:1.5;">${field}</td>
          </tr>
        `).join("")}
      </table>
      `}

      ${role === "CLIENT" && data.welcomeCoupon ? `
      <!-- Welcome Offer -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
        <tr>
          <td style="background:linear-gradient(135deg,#FDF4FF 0%,#FFF7ED 100%);border:1px solid #E9D5FF;border-radius:16px;padding:24px 28px;text-align:center;">
            <p style="margin:0 0 8px;font-size:24px;"></p>
            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#6B21A8;">Exclusive Welcome Offer</p>
            <p style="margin:0 0 16px;font-size:13px;color:#7E22CE;">Use code below for <strong>${couponOfferLine(data.welcomeCoupon)}</strong>.</p>
            <div style="display:inline-block;background:#FFFFFF;border:2px dashed #C084FC;border-radius:10px;padding:10px 28px;">
              <span style="font-family:'Courier New',monospace;font-size:22px;font-weight:800;color:#7C3AED;letter-spacing:0.1em;">${data.welcomeCoupon.code}</span>
            </div>
            ${data.welcomeCoupon.terms ? `<p style="margin:14px 0 0;font-size:11px;color:#9F7AEA;line-height:1.5;">${data.welcomeCoupon.terms}</p>` : ""}
          </td>
        </tr>
      </table>
      ` : ""}

      ${primaryButton(role === "CLIENT" ? "Open Client Portal" : `Open ${roleTitle} Portal`, portalUrl)}

      <p style="margin:0;font-size:13px;color:#94A3B8;text-align:center;line-height:1.6;">Need help? Just reply to this email or reach us at <a href="mailto:${BUSINESS.email}" style="color:#EC4899;text-decoration:none;">${BUSINESS.email}</a></p>
    </div>`;

  return baseLayout(body, `Welcome to Pupparazzi, ${data.userName}! Your ${roleTitle.toLowerCase()} account is ready.`);
}

export function clientProfileRequestEmailHtml(data: { userName: string }) {
  const fields = [
    "Pet name, breed, gender, age/date of birth, weight, coat type, and breed size",
    "Vaccination status with anti-rabies / DHPPiL / corona / kennel cough details if available",
    "Dietary preference, allergies, behaviour notes, medication, and illness history",
    "Local guardian name/contact and walk or feeding schedule where applicable",
    "KYC and vaccination certificate uploads when a boarding or grooming booking is created",
  ];
  const body = `
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:40px 48px;text-align:center;">
      <h1 style="margin:0 0 10px;font-size:30px;font-weight:800;color:#FFFFFF;line-height:1.2;">Help us complete your pet profile</h1>
      <p style="margin:0;font-size:16px;color:#94A3B8;">We only ask for details that help us care safely for your pet.</p>
    </div>
    <div style="padding:40px 48px;" class="email-card">
      <p style="margin:0 0 22px;font-size:15px;color:#475569;line-height:1.7;">Hi <strong style="color:#0F172A;">${data.userName}</strong>,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Your Pupparazzi client profile has been created by our team. Please keep these details ready. When a service booking is created, the form will automatically show the required fields based on the selected service.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        ${fields.map((field) => `
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;font-size:13px;color:#0F172A;font-weight:600;line-height:1.5;">${field}</td>
          </tr>
        `).join("")}
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="background:#FDF2F8;border-left:4px solid #EC4899;border-radius:0 12px 12px 0;padding:16px 20px;">
            <p style="margin:0;font-size:13px;color:#BE185D;line-height:1.6;">For grooming bookings we ask grooming timing/staff/service details. For boarding bookings we ask check-in/out, meal, kennel, weight, guardian, and document details.</p>
          </td>
        </tr>
      </table>
      ${primaryButton("Open Pupparazzi", `${BUSINESS.website}/dashboard`)}
      <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">If you do not have login details yet, simply reply to this email with the information and our team will update it for you.</p>
    </div>`;

  return baseLayout(body, "Please complete your Pupparazzi client and pet details");
}

export function emailVerificationOtpHtml(data: { userName: string; otp: string }) {
  const body = `
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:40px 48px;text-align:center;">
      <h1 style="margin:0 0 10px;font-size:30px;font-weight:800;color:#FFFFFF;line-height:1.2;">Verify your email</h1>
      <p style="margin:0;font-size:16px;color:#94A3B8;">Use this OTP to finish creating your Pupparazzi account.</p>
    </div>

    <div style="padding:40px 48px;" class="email-card">
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Hi <strong style="color:#0F172A;">${data.userName}</strong>,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Enter this code on the verification screen. It expires in 10 minutes.</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:24px;text-align:center;margin-bottom:28px;">
        <p style="margin:0;font-family:'Courier New',monospace;font-size:36px;font-weight:800;color:#EC4899;letter-spacing:0.18em;">${data.otp}</p>
      </div>
      <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">If you did not request this code, you can ignore this email.</p>
    </div>`;

  return baseLayout(body, `Your ${BUSINESS.shortName} verification OTP is ${data.otp}`);
}

/**
 * Sent whenever an account's password actually changes.
 *
 * When an admin or staff member sets the password on someone's behalf the new
 * password is included, because the account holder has no other way to learn it.
 * When the user changed it themselves (forgot-password flow) they already know
 * it, so we send the login ID and a heads-up only — putting a password the user
 * already has into their inbox would be a needless standing risk.
 */
export function passwordUpdatedEmailHtml(data: {
  userName: string;
  email: string;
  password?: string;
  role?: "CLIENT" | "STAFF" | "ADMIN";
  changedByAdmin?: boolean;
}) {
  const role = data.role || "CLIENT";
  const portalUrl = role === "ADMIN" ? `${BUSINESS.website}/admin` : role === "STAFF" ? `${BUSINESS.website}/staff` : `${BUSINESS.website}/dashboard`;
  const byAdmin = Boolean(data.changedByAdmin);
  const body = `
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:40px 48px;text-align:center;">
      <h1 style="margin:0 0 10px;font-size:30px;font-weight:800;color:#FFFFFF;line-height:1.2;">${byAdmin ? "Your password has been updated" : "Your password was changed"}</h1>
      <p style="margin:0;font-size:16px;color:#94A3B8;">${byAdmin ? "Our team set a new password for your account." : "This is a confirmation of the change you just made."}</p>
    </div>
    <div style="padding:40px 48px;" class="email-card">
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Hi <strong style="color:#0F172A;">${data.userName}</strong>,</p>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="background:#F8FAFC;border-left:4px solid #EC4899;border-radius:0 12px 12px 0;padding:16px 20px;">
            <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#0F172A;">Your Login Credentials</p>
            <p style="margin:0 0 ${data.password ? "4px" : "12px"};font-size:13px;color:#475569;">Login ID (Email/Username): <strong style="color:#0F172A;">${data.email}</strong></p>
            ${data.password ? `
            <p style="margin:0 0 12px;font-size:13px;color:#475569;">New Password: <strong style="color:#0F172A;">${data.password}</strong></p>
            <p style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Please sign in with these credentials. For your security, change this password after you log in.</p>
            ` : `
            <p style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">Your new password has been saved. For your security we do not include passwords in email — please sign in with the password you just chose.</p>
            `}
          </td>
        </tr>
      </table>

      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="background:#FFF7ED;border-left:4px solid #F97316;border-radius:0 12px 12px 0;padding:16px 20px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400E;">Didn&rsquo;t expect this?</p>
            <p style="margin:0;font-size:13px;color:#B45309;line-height:1.6;">If you did not request this change, contact us immediately at <a href="mailto:${BUSINESS.email}" style="color:#B45309;">${BUSINESS.email}</a>.</p>
          </td>
        </tr>
      </table>

      ${primaryButton("Sign In", `${BUSINESS.website}/login`)}

      <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">Portal: <a href="${portalUrl}" style="color:#EC4899;text-decoration:none;">${portalUrl}</a></p>
    </div>`;

  return baseLayout(body, byAdmin ? `Your ${BUSINESS.shortName} password has been updated` : `Your ${BUSINESS.shortName} password was changed`);
}

export function passwordResetEmailHtml(data: { userName: string; resetUrl: string }) {
  const body = `
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:40px 48px;text-align:center;">
      <h1 style="margin:0 0 10px;font-size:30px;font-weight:800;color:#FFFFFF;line-height:1.2;">Reset your password</h1>
      <p style="margin:0;font-size:16px;color:#94A3B8;">Use the secure link below to choose a new password.</p>
    </div>
    <div style="padding:40px 48px;" class="email-card">
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Hi <strong style="color:#0F172A;">${data.userName}</strong>,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">We received a request to reset your Pupparazzi account password. This link expires in 30 minutes.</p>
      ${primaryButton("Reset Password", data.resetUrl)}
      <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">If you did not request this, you can safely ignore this email.</p>
    </div>`;

  return baseLayout(body, `Reset your ${BUSINESS.shortName} password`);
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 4 – BOOKING CANCELLATION
// ═══════════════════════════════════════════════════════════════

export function cancellationEmailHtml(data: {
  userName: string;
  bookingId: string;
  serviceName: string;
  slotDate: string;
  refundAmount?: string;
}) {
  const body = `
    <!-- Header Band -->
    <div style="background:linear-gradient(135deg,#450A0A 0%,#7F1D1D 100%);padding:36px 48px 32px;text-align:center;">
      <div style="width:60px;height:60px;background:rgba(239,68,68,0.2);border-radius:50%;margin:0 auto 20px;text-align:center;line-height:60px;font-size:28px;">x</div>
      <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#FFFFFF;line-height:1.2;">Booking Cancelled</h1>
      <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.65);line-height:1.6;">We&rsquo;re sorry to see you go, ${data.userName}.</p>
    </div>

    <!-- Body -->
    <div style="padding:40px 48px;" class="email-card">
      <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.7;">Your booking has been successfully cancelled as requested. Below are the details:</p>

      <!-- Cancelled Booking Card -->
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="background:#FEF2F2;border:1px solid #FECACA;border-radius:16px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#DC2626 0%,#B91C1C 100%);padding:16px 24px;">
              <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:0.1em;text-transform:uppercase;">Cancelled Booking</p>
              <p style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:0.04em;">${data.bookingId}</p>
            </div>
            <div style="padding:20px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                ${infoRow("Service", data.serviceName)}
                ${infoRow("Scheduled Date", data.slotDate)}
                ${data.refundAmount ? infoRow("Refund Amount", `₹${data.refundAmount}`) : ""}
              </table>
            </div>
          </td>
        </tr>
      </table>

      ${data.refundAmount ? `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:18px 22px;">
            <p style="margin:0;font-size:14px;color:#15803D;line-height:1.6;"> <strong>Refund of ₹${data.refundAmount}</strong> will be processed to your original payment method within <strong>5–7 business days</strong>.</p>
          </td>
        </tr>
      </table>` : ""}

      <p style="margin:0 0 8px;font-size:15px;color:#475569;line-height:1.7;">We hope to serve you again soon. Browse our services and book your next appointment!</p>

      ${primaryButton("Book a New Service", `${BUSINESS.website}/book`)}

      <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">Need assistance? Contact us at <a href="mailto:${BUSINESS.email}" style="color:#EC4899;text-decoration:none;">${BUSINESS.email}</a></p>
    </div>`;

  return baseLayout(body, `Your booking ${data.bookingId} has been cancelled`);
}

export function bookingStatusEmailHtml(data: {
  userName: string;
  bookingId: string;
  serviceName: string;
  petName: string;
  status: string;
  slotDate: string;
  slotTime: string;
}) {
  const body = `
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:36px 48px 32px;text-align:center;">
      <h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#FFFFFF;line-height:1.2;">Booking ${data.status}</h1>
      <p style="margin:0;font-size:15px;color:#94A3B8;line-height:1.6;">Your Pupparazzi booking status has been updated.</p>
    </div>
    <div style="padding:40px 48px;" class="email-card">
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Hi <strong style="color:#0F172A;">${data.userName}</strong>,</p>
      ${sectionTitle("Booking Details")}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        ${infoRow("Booking ID", data.bookingId)}
        ${infoRow("Status", data.status)}
        ${infoRow("Service", data.serviceName)}
        ${infoRow("Pet", data.petName)}
        ${infoRow("Appointment", `${data.slotDate} at ${data.slotTime}`)}
      </table>
      ${primaryButton("View Booking", `${BUSINESS.website}/dashboard`)}
      <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">Questions? Reply to this email or contact us at <a href="mailto:${BUSINESS.email}" style="color:#EC4899;text-decoration:none;">${BUSINESS.email}</a></p>
    </div>`;

  return baseLayout(body, `Your booking ${data.bookingId} is now ${data.status}`);
}

export function bookingReminderEmailHtml(data: {
  userName: string;
  bookingId: string;
  serviceName: string;
  petName: string;
  slotDate: string;
  slotTime: string;
  reminderLabel: string;
}) {
  const body = `
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:36px 48px 32px;text-align:center;">
      <h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#FFFFFF;line-height:1.2;">Booking Reminder</h1>
      <p style="margin:0;font-size:15px;color:#94A3B8;line-height:1.6;">Your Pupparazzi appointment is coming up ${data.reminderLabel}.</p>
    </div>
    <div style="padding:40px 48px;" class="email-card">
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Hi <strong style="color:#0F172A;">${data.userName}</strong>,</p>
      ${sectionTitle("Appointment Details")}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        ${infoRow("Booking ID", data.bookingId)}
        ${infoRow("Service", data.serviceName)}
        ${infoRow("Pet", data.petName)}
        ${infoRow("Date", data.slotDate)}
        ${infoRow("Time", data.slotTime)}
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="background:#FFF7ED;border-left:4px solid #F97316;border-radius:0 12px 12px 0;padding:16px 20px;">
            <p style="margin:0;font-size:13px;color:#B45309;line-height:1.6;">Please keep your pet ready at the scheduled time. If you need help, reply to this email.</p>
          </td>
        </tr>
      </table>
      ${primaryButton("View My Booking", `${BUSINESS.website}/dashboard`)}
      <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">Questions? Contact us at <a href="mailto:${BUSINESS.email}" style="color:#EC4899;text-decoration:none;">${BUSINESS.email}</a></p>
    </div>`;

  return baseLayout(body, `Reminder: ${data.serviceName} on ${data.slotDate} at ${data.slotTime}`);
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 5 – BOARDING STAY EXTENSION
// ═══════════════════════════════════════════════════════════════

export function extensionRequestedEmailHtml(data: {
  userName: string;
  bookingId: string;
  serviceName: string;
  petName: string;
  newCheckOut: string;
  extraAmount: string;
}) {
  const body = `
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:36px 48px 32px;text-align:center;">
      <h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#FFFFFF;line-height:1.2;">Extension requested</h1>
      <p style="margin:0;font-size:15px;color:#94A3B8;line-height:1.6;">We&rsquo;ve received your request to extend ${data.petName}&rsquo;s stay.</p>
    </div>
    <div style="padding:40px 48px;" class="email-card">
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Hi <strong style="color:#0F172A;">${data.userName}</strong>,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Our team will review your request and confirm shortly. Nothing has changed on your booking yet.</p>
      ${sectionTitle("Requested Change")}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        ${infoRow("Booking ID", data.bookingId)}
        ${infoRow("Service", data.serviceName)}
        ${infoRow("Pet", data.petName)}
        ${infoRow("New Check-out", data.newCheckOut)}
        ${infoRow("Additional Charge", `₹${data.extraAmount}`)}
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td style="background:#FFF7ED;border-left:4px solid #F97316;border-radius:0 12px 12px 0;padding:16px 20px;">
            <p style="margin:0;font-size:13px;color:#B45309;line-height:1.6;">This extension is subject to availability and is not confirmed until our team approves it.</p>
          </td>
        </tr>
      </table>
      ${primaryButton("View My Booking", `${BUSINESS.website}/dashboard/bookings`)}
    </div>`;

  return baseLayout(body, `Extension requested for booking ${data.bookingId}`);
}

export function extensionApprovedEmailHtml(data: {
  userName: string;
  bookingId: string;
  serviceName: string;
  petName: string;
  newCheckOut: string;
  extraAmount: string;
  newTotal: string;
}) {
  const body = `
    <div style="background:linear-gradient(135deg,#064E3B 0%,#065F46 100%);padding:36px 48px 32px;text-align:center;">
      <div style="display:inline-block;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:100px;padding:6px 18px;margin-bottom:20px;">
        <span style="color:#10B981;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Stay Extended</span>
      </div>
      <h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#FFFFFF;line-height:1.2;">${data.petName}&rsquo;s stay has been extended</h1>
      <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.6;">Your new check-out is confirmed.</p>
    </div>
    <div style="padding:40px 48px;" class="email-card">
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Hi <strong style="color:#0F172A;">${data.userName}</strong>,</p>
      ${sectionTitle("Updated Booking")}
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:8px;">
        ${infoRow("Booking ID", data.bookingId)}
        ${infoRow("Service", data.serviceName)}
        ${infoRow("Pet", data.petName)}
        ${infoRow("New Check-out", data.newCheckOut)}
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F8FAFC;border-radius:14px;overflow:hidden;margin:24px 0;">
        <tr>
          <td style="padding:20px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="font-size:13px;color:#64748B;padding-bottom:16px;">Additional charge for the extension</td>
                <td style="font-size:13px;color:#0F172A;font-weight:600;text-align:right;padding-bottom:16px;">₹${data.extraAmount}</td>
              </tr>
              <tr style="border-top:2px solid #E2E8F0;">
                <td style="font-size:16px;font-weight:800;color:#0F172A;padding-top:16px;">Updated Total</td>
                <td style="font-size:20px;font-weight:800;color:#EC4899;text-align:right;padding-top:16px;">₹${data.newTotal}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 8px;font-size:13px;color:#64748B;line-height:1.6;">Any balance for the extension will be collected as per your existing payment arrangement.</p>
      ${primaryButton("View My Booking", `${BUSINESS.website}/dashboard/bookings`)}
    </div>`;

  return baseLayout(body, `Booking ${data.bookingId} extended – new check-out ${data.newCheckOut}`);
}

export function extensionRejectedEmailHtml(data: {
  userName: string;
  bookingId: string;
  serviceName: string;
  petName: string;
}) {
  const body = `
    <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:36px 48px 32px;text-align:center;">
      <h1 style="margin:0 0 10px;font-size:28px;font-weight:800;color:#FFFFFF;line-height:1.2;">Extension not available</h1>
      <p style="margin:0;font-size:15px;color:#94A3B8;line-height:1.6;">We could not extend ${data.petName}&rsquo;s stay.</p>
    </div>
    <div style="padding:40px 48px;" class="email-card">
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Hi <strong style="color:#0F172A;">${data.userName}</strong>,</p>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.7;">Unfortunately we are unable to extend this stay, usually because we are fully booked for those dates. Your original booking is unchanged and still confirmed.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        ${infoRow("Booking ID", data.bookingId)}
        ${infoRow("Service", data.serviceName)}
        ${infoRow("Pet", data.petName)}
      </table>
      <p style="margin:0 0 8px;font-size:15px;color:#475569;line-height:1.7;">Please reply to this email or call us and we will do our best to find an alternative.</p>
      ${primaryButton("View My Booking", `${BUSINESS.website}/dashboard/bookings`)}
    </div>`;

  return baseLayout(body, `Extension request for booking ${data.bookingId} could not be approved`);
}

// ═══════════════════════════════════════════════════════════════
// SEND FUNCTIONS
// ═══════════════════════════════════════════════════════════════

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: nodemailer.SendMailOptions["attachments"];
  emailType?: string;
  relatedUserId?: string | null;
  relatedPetId?: string | null;
  relatedBookingId?: string | null;
  idempotencyKey?: string | null;
}

export type SendMailResult =
  | { success: true; messageId?: string }
  | { success: false; error: string };

function redactEmailError(error: unknown) {
  return String(error).replace(/(pass|password|token|secret)=([^&\s]+)/gi, "$1=[redacted]").slice(0, 1000);
}

async function reserveEmailLog(options: MailOptions) {
  if (!options.idempotencyKey) return null;
  try {
    const existing = await prisma.emailLog.findUnique({ where: { idempotency_key: options.idempotencyKey } });
    if (existing?.status === "Sent") return { ...existing, alreadySent: true };
    return await prisma.emailLog.upsert({
      where: { idempotency_key: options.idempotencyKey },
      update: {
        attempted_at: new Date(),
        attempt_count: { increment: 1 },
        status: "Queued",
        failure_reason: null,
        retry_eligible: false,
      },
      create: {
        idempotency_key: options.idempotencyKey,
        email_type: options.emailType || "transactional",
        recipient: options.to,
        subject: options.subject,
        related_user_id: options.relatedUserId || null,
        related_pet_id: options.relatedPetId || null,
        related_booking_id: options.relatedBookingId || null,
        attempted_at: new Date(),
        attempt_count: 1,
      },
    });
  } catch {
    return null;
  }
}

async function writeEmailLog(options: MailOptions, result: SendMailResult, reservedId?: string | null) {
  const data = result.success
    ? {
        status: "Sent",
        sent_at: new Date(),
        provider_message_id: result.messageId || null,
        failure_reason: null,
        retry_eligible: false,
      }
    : {
        status: "Failed",
        failure_reason: result.error,
        retry_eligible: true,
      };

  try {
    if (reservedId) {
      await prisma.emailLog.update({ where: { id: reservedId }, data });
      return;
    }
    await prisma.emailLog.create({
      data: {
        email_type: options.emailType || "transactional",
        recipient: options.to,
        subject: options.subject,
        related_user_id: options.relatedUserId || null,
        related_pet_id: options.relatedPetId || null,
        related_booking_id: options.relatedBookingId || null,
        idempotency_key: options.idempotencyKey || undefined,
        attempted_at: new Date(),
        attempt_count: 1,
        ...data,
      },
    });
  } catch (error) {
    console.error("Email log write error:", redactEmailError(error));
  }
}

export async function sendMail(options: MailOptions): Promise<SendMailResult> {
  const { to, subject, html, text, replyTo, attachments } = options;
  const reserved = await reserveEmailLog(options);
  if ((reserved as any)?.alreadySent) {
    return { success: true, messageId: reserved?.provider_message_id || undefined };
  }
  try {
    const smtp = await getSetting("smtp", DEFAULT_SMTP_SETTINGS);
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: Boolean(smtp.secure),
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });
    const info = await transporter.sendMail({
      from: `"${smtp.fromName || BUSINESS.name}" <${smtp.fromEmail || smtp.user || process.env.GMAIL_USER}>`,
      to,
      replyTo: replyTo || process.env.SMTP_REPLY_TO || undefined,
      subject,
      html,
      text,
      attachments,
    });
    const result: SendMailResult = { success: true, messageId: info.messageId };
    await writeEmailLog(options, result, reserved?.id);
    return result;
  } catch (error) {
    const result: SendMailResult = { success: false, error: redactEmailError(error) };
    console.error("Email send error:", result.error);
    await writeEmailLog(options, result, reserved?.id);
    return result;
  }
}

export async function sendBookingConfirmation(to: string, data: Parameters<typeof bookingConfirmationHtml>[0]) {
  const detailFormName = data.detailFormService || data.serviceCategory || data.serviceName;
  if (data.detailFormLink) {
    return sendMail({
      to,
      subject: `Complete Your ${detailFormName} Booking Details - ${data.bookingId} | ${BUSINESS.shortName}`,
      html: bookingConfirmationHtml(data),
    });
  }
  return sendMail({
    to,
    subject: `Booking Confirmed – ${data.bookingId} | ${BUSINESS.shortName}`,
    html: bookingConfirmationHtml(data),
  });
}

export async function sendPaymentConfirmation(
  to: string,
  data: Parameters<typeof paymentConfirmationHtml>[0],
  invoicePdfBuffer: Buffer
) {
  return sendMail({
    to,
    subject: `Payment Receipt & GST Invoice – ${data.invoiceNumber} | ${BUSINESS.shortName}`,
    html: paymentConfirmationHtml(data),
    attachments: [
      {
        filename: `${data.invoiceNumber}.pdf`,
        content: invoicePdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function sendWelcomeEmail(to: string, data: Parameters<typeof welcomeEmailHtml>[0]) {
  const welcomeCoupon = data.welcomeCoupon === undefined ? await welcomeEmailCoupon() : data.welcomeCoupon;
  return sendMail({
    to,
    subject: `Welcome to ${BUSINESS.shortName}, ${data.userName}! `,
    html: welcomeEmailHtml({ ...data, welcomeCoupon }),
    emailType: "welcome",
    idempotencyKey: `welcome:${to.toLowerCase()}`,
  });
}

export async function sendClientProfileRequestEmail(to: string, data: Parameters<typeof clientProfileRequestEmailHtml>[0]) {
  return sendMail({
    to,
    subject: `Pet profile details needed | ${BUSINESS.shortName}`,
    html: clientProfileRequestEmailHtml(data),
  });
}

export async function sendEmailVerificationOtp(to: string, data: Parameters<typeof emailVerificationOtpHtml>[0]) {
  return sendMail({
    to,
    subject: `${data.otp} is your ${BUSINESS.shortName} verification OTP`,
    html: emailVerificationOtpHtml(data),
  });
}

export async function sendPasswordResetEmail(to: string, data: Parameters<typeof passwordResetEmailHtml>[0]) {
  return sendMail({
    to,
    subject: `Reset your ${BUSINESS.shortName} password`,
    html: passwordResetEmailHtml(data),
    emailType: "password_reset",
  });
}

export async function sendPasswordUpdatedEmail(to: string, data: Parameters<typeof passwordUpdatedEmailHtml>[0]) {
  return sendMail({
    to,
    subject: data.changedByAdmin
      ? `Your ${BUSINESS.shortName} login details have been updated`
      : `Your ${BUSINESS.shortName} password was changed`,
    html: passwordUpdatedEmailHtml(data),
  });
}

export async function sendCancellationEmail(to: string, data: Parameters<typeof cancellationEmailHtml>[0]) {
  return sendMail({
    to,
    subject: `Booking Cancelled – ${data.bookingId} | ${BUSINESS.shortName}`,
    html: cancellationEmailHtml(data),
  });
}

export async function sendBookingStatusEmail(to: string, data: Parameters<typeof bookingStatusEmailHtml>[0]) {
  return sendMail({
    to,
    subject: `Booking ${data.status} - ${data.bookingId} | ${BUSINESS.shortName}`,
    html: bookingStatusEmailHtml(data),
  });
}

export async function sendBookingReminderEmail(to: string, data: Parameters<typeof bookingReminderEmailHtml>[0]) {
  return sendMail({
    to,
    subject: `Reminder: ${data.bookingId} is coming up | ${BUSINESS.shortName}`,
    html: bookingReminderEmailHtml(data),
  });
}

export async function sendExtensionRequestedEmail(to: string, data: Parameters<typeof extensionRequestedEmailHtml>[0]) {
  return sendMail({
    to,
    subject: `Extension requested – ${data.bookingId} | ${BUSINESS.shortName}`,
    html: extensionRequestedEmailHtml(data),
  });
}

export async function sendExtensionApprovedEmail(to: string, data: Parameters<typeof extensionApprovedEmailHtml>[0]) {
  return sendMail({
    to,
    subject: `Stay extended – ${data.bookingId} | ${BUSINESS.shortName}`,
    html: extensionApprovedEmailHtml(data),
  });
}

export async function sendExtensionRejectedEmail(to: string, data: Parameters<typeof extensionRejectedEmailHtml>[0]) {
  return sendMail({
    to,
    subject: `Extension not available – ${data.bookingId} | ${BUSINESS.shortName}`,
    html: extensionRejectedEmailHtml(data),
  });
}
