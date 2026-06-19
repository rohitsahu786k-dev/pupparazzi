import fs from "fs";
import path from "path";
import { ObjectId } from "mongodb";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { saveGridFsUpload } from "@/lib/upload-storage";

export const OLD_DATA_DEFAULT_ROOT = process.env.OLD_DATA_IMPORT_ROOT || "D:/webapps/bulk_export_2026-04-30/old data";
const SOURCE = "Old Data Import";

type Row = Record<string, any>;
type ProfileDraft = {
  clientKey: string;
  matchType: string;
  clientName: string;
  phone: string;
  email: string;
  address: string;
  clients: Row[];
  bookings: Row[];
  boarding: Row[];
  grooming: Row[];
  invoices: Row[];
  invoiceBreakdown: Row[];
  payments: Row[];
  pets: Map<string, Row>;
  duplicateNotes: string[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return clean(value).toLowerCase();
}

function normalizePhone(value: unknown) {
  const digits = clean(value).replace(/\D/g, "");
  if (!digits) return "";
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function normalizeEmail(value: unknown) {
  return lower(value);
}

function normalizeName(value: unknown) {
  return lower(value).replace(/\s+/g, " ");
}

function numberValue(value: unknown) {
  const num = Number(clean(value).replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function dateValue(value: unknown) {
  const text = clean(value);
  if (!text) return "";
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
}

function dateForSort(value: unknown) {
  const parsed = new Date(clean(value));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function nullableDateObject(value: unknown) {
  const text = clean(value);
  if (!text || text === "Not available") return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function syntheticEmail(clientKey: string) {
  return `old-${clientKey.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}@old-import.local`;
}

function paymentStatus(total: number, paid: number, due: number) {
  if (due < 0) return "Advance / Wallet Adjustment";
  if (paid >= total && due <= 0) return "Paid";
  if (paid <= 0 && due > 0) return "Unpaid";
  if (paid > 0 && paid < total) return "Partially Paid";
  return due > 0 ? "Due" : "Paid";
}

function readCsv(filePath: string): Row[] {
  const text = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
  return (parsed.data || []).map((row) => ({ ...row }));
}

function readSheet(filePath: string, sheetName: string): Row[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: "", raw: false });
}

function pdfMap(root: string) {
  const dir = path.join(root, "invoice_pdfs", "Pupparazzi");
  if (!fs.existsSync(dir)) return new Map<string, string>();
  return new Map(
    fs.readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith(".pdf"))
      .map((file) => [path.basename(file, ".pdf"), path.join(dir, file)])
  );
}

export function readOldData(root = OLD_DATA_DEFAULT_ROOT) {
  return {
    root,
    clients: readCsv(path.join(root, "clients.csv")),
    bookings: readSheet(path.join(root, "bookings", "Pupparazzi.xlsx"), "Bookings"),
    boarding: readSheet(path.join(root, "bookings", "Pupparazzi.xlsx"), "Boarding"),
    grooming: readSheet(path.join(root, "bookings", "Pupparazzi.xlsx"), "Grooming"),
    addOns: readSheet(path.join(root, "bookings", "Pupparazzi.xlsx"), "Add-On Services"),
    invoices: readSheet(path.join(root, "invoices", "Pupparazzi.xlsx"), "Invoices"),
    invoiceBreakdown: readSheet(path.join(root, "invoices", "Pupparazzi.xlsx"), "Breakdown"),
    payments: readSheet(path.join(root, "payments", "Pupparazzi.xlsx"), "Payments"),
    pdfs: pdfMap(root),
  };
}

function clientIdentity(row: Row) {
  const phone = normalizePhone(row["Phone Number"] ?? row.Phone ?? row["Phone"]);
  const email = normalizeEmail(row.Email);
  const name = normalizeName(row.Name ?? row.Parent ?? row["Pet Parent"]);
  const pet = normalizeName(row["Pet Name"] ?? row.Pet);
  if (phone) return { key: `phone:${phone}`, type: "Phone", phone, email, name };
  if (email) return { key: `email:${email}`, type: "Email", phone, email, name };
  return { key: `name_pet:${name}|${pet}`, type: "Name + Pet", phone, email, name };
}

function eventIdentity(row: Row) {
  const phone = normalizePhone(row["Phone Number"] ?? row.Phone);
  const email = normalizeEmail(row.Email);
  const name = normalizeName(row.Parent ?? row["Pet Parent"]);
  if (phone) return `phone:${phone}`;
  if (email) return `email:${email}`;
  return name ? `parent:${name}` : "";
}

function ensureProfile(profiles: Map<string, ProfileDraft>, key: string, seed: Partial<ProfileDraft>) {
  let profile = profiles.get(key);
  if (!profile) {
    profile = {
      clientKey: key,
      matchType: "Unknown",
      clientName: "",
      phone: "",
      email: "",
      address: "",
      clients: [],
      bookings: [],
      boarding: [],
      grooming: [],
      invoices: [],
      invoiceBreakdown: [],
      payments: [],
      pets: new Map(),
      duplicateNotes: [],
      ...seed,
    };
    profiles.set(key, profile);
  }
  return profile;
}

function profileForEvent(
  profiles: Map<string, ProfileDraft>,
  parentIndex: Map<string, string>,
  row: Row,
) {
  const key = eventIdentity(row);
  if (key.startsWith("phone:") || key.startsWith("email:")) {
    return profiles.get(key) || ensureProfile(profiles, key, {
      clientKey: key,
      matchType: key.startsWith("phone:") ? "Phone" : "Email",
      clientName: clean(row.Parent ?? row["Pet Parent"]),
      phone: normalizePhone(row["Phone Number"] ?? row.Phone),
      email: normalizeEmail(row.Email),
    });
  }
  if (key.startsWith("parent:")) {
    const indexed = parentIndex.get(key.replace("parent:", ""));
    if (indexed) return profiles.get(indexed);
    return ensureProfile(profiles, key, {
      clientKey: key,
      matchType: "Parent Name",
      clientName: clean(row.Parent ?? row["Pet Parent"]),
    });
  }
  return ensureProfile(profiles, "unknown:missing-client", {
    clientKey: "unknown:missing-client",
    matchType: "Missing",
    clientName: "Not available",
  });
}

function buildProfiles(data: ReturnType<typeof readOldData>) {
  const profiles = new Map<string, ProfileDraft>();
  const parentIndex = new Map<string, string>();
  const bookingToKey = new Map<string, string>();
  const invoiceToKey = new Map<string, string>();

  for (const row of data.clients) {
    const identity = clientIdentity(row);
    const profile = ensureProfile(profiles, identity.key, {
      clientKey: identity.key,
      matchType: identity.type,
      clientName: clean(row.Name),
      phone: identity.phone,
      email: identity.email,
      address: clean(row.Address),
    });
    profile.clients.push(row);
    if (!profile.clientName) profile.clientName = clean(row.Name);
    if (!profile.phone) profile.phone = identity.phone;
    if (!profile.email) profile.email = identity.email;
    if (!profile.address) profile.address = clean(row.Address);
    const petName = clean(row["Pet Name"]);
    if (petName) profile.pets.set(normalizeName(petName), row);
    const parentName = normalizeName(row.Name);
    if (parentName && !parentIndex.has(parentName)) parentIndex.set(parentName, identity.key);
  }

  for (const row of data.bookings) {
    const profile = profileForEvent(profiles, parentIndex, row);
    profile?.bookings.push(row);
    const bookingId = clean(row["Booking ID"]);
    if (bookingId && profile) bookingToKey.set(bookingId, profile.clientKey);
    const invoiceNo = clean(row["Invoice Number"]);
    if (invoiceNo && profile) invoiceToKey.set(invoiceNo, profile.clientKey);
  }

  for (const row of data.boarding) {
    const bookingId = clean(row["Booking ID"]);
    const key = bookingToKey.get(bookingId);
    const profile = key ? profiles.get(key) : undefined;
    if (profile) {
      profile.boarding.push(row);
      const petName = clean(row["Pet Name"]);
      if (petName && !profile.pets.has(normalizeName(petName))) profile.pets.set(normalizeName(petName), row);
    }
  }

  for (const row of data.grooming) {
    const bookingId = clean(row["Booking ID"]);
    const key = bookingToKey.get(bookingId);
    const profile = key ? profiles.get(key) : undefined;
    if (profile) {
      profile.grooming.push(row);
      const petName = clean(row["Pet Name"]);
      if (petName && !profile.pets.has(normalizeName(petName))) profile.pets.set(normalizeName(petName), row);
    }
  }

  for (const row of data.invoices) {
    const invoiceNo = clean(row["Invoice No"]);
    const byInvoice = invoiceToKey.get(invoiceNo);
    const profile = byInvoice ? profiles.get(byInvoice) : profileForEvent(profiles, parentIndex, row);
    profile?.invoices.push(row);
    if (invoiceNo && profile) invoiceToKey.set(invoiceNo, profile.clientKey);
  }

  for (const row of data.invoiceBreakdown) {
    const invoiceNo = clean(row["Invoice No"]);
    const key = invoiceToKey.get(invoiceNo);
    const profile = key ? profiles.get(key) : undefined;
    profile?.invoiceBreakdown.push(row);
  }

  for (const row of data.payments) {
    const invoiceNo = clean(row["Invoice ID"]);
    const key = invoiceToKey.get(invoiceNo);
    const profile = key ? profiles.get(key) : profileForEvent(profiles, parentIndex, row);
    profile?.payments.push(row);
  }

  return [...profiles.values()];
}

function mappedProfile(profile: ProfileDraft, pdfs: Map<string, string>, pdfAssets?: Map<string, { assetId: string; path: string }>) {
  const clientRow = profile.clients[0] || {};
  const petRows = [...profile.pets.values()];
  const invoices = profile.invoices.map((row) => {
    const invoiceNo = clean(row["Invoice No"]);
    const revenue = numberValue(row.Revenue);
    const paid = numberValue(row.Paid);
    const due = numberValue(row.Due);
    const pdf = pdfAssets?.get(invoiceNo);
    return {
      invoice_number: invoiceNo || "Not available",
      invoice_type: clean(row["Invoice Type"]) || "Not available",
      invoice_date: clean(row["Invoice Date"]) || "Not available",
      booking_id: clean(row["Booking ID"]) || "Not available",
      booking_date: clean(row["Booking Date"]) || "Not available",
      pet_name: clean(row.Pet) || "Not available",
      client_name: clean(row.Parent) || profile.clientName || "Not available",
      phone: clean(row["Phone Number"]) || profile.phone || "Not available",
      revenue,
      base_amount: numberValue(row["Base Amount"]),
      add_on_amount: numberValue(row["Add-On Amount"]),
      discount_amount: numberValue(row["Discount Amount"]),
      additional_amount: numberValue(row["Additional Amount"]),
      additional_discount_amount: numberValue(row["Additional Discount Amount"]),
      paid_amount: paid,
      due_amount: due,
      payment_mode: clean(row["Payment Mode"]) || "Not available",
      payment_status: paymentStatus(revenue, paid, due),
      pdf_available: pdfs.has(invoiceNo),
      pdf_asset_id: pdf?.assetId || null,
      pdf_path: pdf?.path || null,
      source: SOURCE,
      raw: row,
    };
  });
  const paymentsFromInvoices = invoices.map((invoice) => ({
    payment_date: invoice.invoice_date,
    invoice_number: invoice.invoice_number,
    booking_id: invoice.booking_id,
    client_name: invoice.client_name,
    pet_name: invoice.pet_name,
    total_amount: invoice.revenue,
    paid_amount: invoice.paid_amount,
    due_amount: invoice.due_amount,
    payment_mode: invoice.payment_mode,
    payment_status: invoice.payment_status,
    source: "Invoice Import",
  }));
  const explicitPayments = profile.payments.map((row) => ({
    payment_date: clean(row.Time) || "Not available",
    invoice_number: clean(row["Invoice ID"]) || "Not available",
    booking_id: clean(row["Invoice ID"]) || "Not available",
    client_name: clean(row.Parent) || profile.clientName || "Not available",
    pet_name: "Not available",
    total_amount: numberValue(row.Amount),
    paid_amount: numberValue(row.Amount),
    due_amount: 0,
    payment_mode: clean(row.Mode) || "Not available",
    payment_status: "Paid",
    source: clean(row.Source) || "Payment Import",
    transaction_id: clean(row["Transaction ID"]) || "Not available",
    raw: row,
  }));
  const bookingHistory = profile.bookings.map((row) => ({
    booking_id: clean(row["Booking ID"]) || "Not available",
    booking_date: clean(row["Booking Date"]) || "Not available",
    pet_name: "Not available",
    service_type: clean(row["Service Types"]) || "Not available",
    booking_status: clean(row["Payment Status"]) || "Not available",
    booking_source: clean(row["Booking Source"]) || "Not available",
    notes: clean(row.Notes) || "Not available",
    additional_instructions: clean(row["Additional Instruction"]) || "Not available",
    created_date: clean(row["Created At"]) || "Not available",
    source: SOURCE,
    raw: row,
  }));
  const boardingHistory = profile.boarding.map((row) => ({
    booking_id: clean(row["Booking ID"]) || "Not available",
    pet_name: clean(row["Pet Name"]) || "Not available",
    breed: clean(row.Breed) || "Not available",
    boarding_type: clean(row["Boarding Type"]) || "Not available",
    service_name: clean(row["Service Name"]) || "Not available",
    check_in_date: clean(row["Check-In Date"]) || "Not available",
    check_out_date: clean(row["Check-Out Date"]) || "Not available",
    check_in_time: clean(row["Check-In Time"]) || "Not available",
    check_out_time: clean(row["Check-Out Time"]) || "Not available",
    check_in_slot: clean(row["Check-In Slot"]) || "Not available",
    check_out_slot: clean(row["Check-Out Slot"]) || "Not available",
    meal_type: clean(row["Meal Type"]) || "Not available",
    kennel: clean(row.Kennel) || "Not available",
    weight: clean(row.Weight) || "Not available",
    check_out_weight: clean(row["Check-Out Weight"]) || "Not available",
    final_amount: numberValue(row["Final Amount"]),
    late_checkout_fees: numberValue(row["Late Checkout Fees"]),
    refund_amount: numberValue(row["Refund Amount"]),
    refund_reason: clean(row["Refund Reason"]) || "Not available",
    companion_name: clean(row["Companion Name"]) || "Not available",
    companion_phone: clean(row["Companion Phone"]) || "Not available",
    notes: clean(row.Notes) || "Not available",
    created_date: clean(row["Created At"]) || "Not available",
    source: SOURCE,
    raw: row,
  }));
  const groomingHistory = profile.grooming.map((row) => ({
    booking_id: clean(row["Booking ID"]) || "Not available",
    pet_name: clean(row["Pet Name"]) || "Not available",
    breed: clean(row.Breed) || "Not available",
    booking_date: clean(row["Booking Date"]) || "Not available",
    start_time: clean(row["Start Time"]) || "Not available",
    end_time: clean(row["End Time"]) || "Not available",
    staff_name: clean(row.Staff) || "Not available",
    grooming_services: clean(row.Services) || "Not available",
    booking_status: clean(row.Status) || "Not available",
    notes: clean(row.Notes) || "Not available",
    created_date: clean(row["Created At"]) || "Not available",
    source: SOURCE,
    raw: row,
  }));
  const timeline = [
    ...bookingHistory.map((item) => ({ type: "Booking", date: item.booking_date, title: `Booking ${item.booking_id}`, item })),
    ...boardingHistory.map((item) => ({ type: "Boarding", date: item.check_in_date, title: `Boarding ${item.booking_id}`, item })),
    ...groomingHistory.map((item) => ({ type: "Grooming", date: item.booking_date, title: `Grooming ${item.booking_id}`, item })),
    ...invoices.map((item) => ({ type: "Invoice", date: item.invoice_date, title: `Invoice ${item.invoice_number}`, item })),
    ...paymentsFromInvoices.map((item) => ({ type: "Payment", date: item.payment_date, title: `Payment ${item.invoice_number}`, item })),
    ...explicitPayments.map((item) => ({ type: "Payment", date: item.payment_date, title: `Payment ${item.invoice_number}`, item })),
  ].sort((a, b) => dateForSort(b.date) - dateForSort(a.date));
  const totalRevenue = invoices.reduce((sum, item) => sum + item.revenue, 0);
  const totalPaid = invoices.reduce((sum, item) => sum + item.paid_amount, 0);
  const totalDue = invoices.reduce((sum, item) => sum + item.due_amount, 0);
  const summary = {
    total_bookings: profile.bookings.length,
    total_grooming_sessions: profile.grooming.length,
    total_boarding_bookings: profile.boarding.length,
    total_invoices: invoices.length,
    total_revenue: totalRevenue,
    total_paid: totalPaid,
    total_due: totalDue,
    wallet_balance: numberValue(clientRow["Wallet Balance"]),
    outstanding_balance: numberValue(clientRow["Outstanding Balance"]),
    last_booking_date: [...profile.bookings.map((row) => clean(row["Booking Date"])), clean(clientRow["Lastest Booking Date"])].filter(Boolean).sort((a, b) => dateForSort(b) - dateForSort(a))[0] || "Not available",
    last_payment_date: [...paymentsFromInvoices.map((row) => row.payment_date), ...explicitPayments.map((row) => row.payment_date)].filter(Boolean).sort((a, b) => dateForSort(b) - dateForSort(a))[0] || "Not available",
  };

  return {
    clientDetails: {
      client_name: profile.clientName || "Not available",
      phone: profile.phone || "Not available",
      email: profile.email || "Not available",
      address: profile.address || "Not available",
      onboarding_date: clean(clientRow["Onboarding Date"]) || "Not available",
      client_status: clean(clientRow.Status) || "Not available",
      client_tags: clean(clientRow["Client Tags"]) || "Not available",
      home_outlet: clean(clientRow["Home Outlet"]) || "Not available",
      wallet_balance: numberValue(clientRow["Wallet Balance"]),
      outstanding_balance: numberValue(clientRow["Outstanding Balance"]),
    },
    petDetails: petRows.map((row) => ({
      pet_name: clean(row["Pet Name"]) || "Not available",
      pet_type: clean(row["Pet Type"]) || "Not available",
      breed: clean(row.Breed) || "Not available",
      gender: clean(row.Gender) || "Not available",
      birthday: clean(row["Pet Birthday"]) || "Not available",
      coat: clean(row.Coat) || clean(row["Coat Length"]) || "Not available",
      breed_size: clean(row["Breed Size"]) || "Not available",
      weight: clean(row["Weight (kg)"] ?? row.Weight) || "Not available",
      adoption_status: clean(row["Adoption Status"]) || "Not available",
      neutered_or_spayed: clean(row["Neutered Or Spayed"]) || "Not available",
      pet_social_media: clean(row["Pet Social Media Handle"]) || "Not available",
      consent_photos: clean(row["Consent To Use Pet Photos"]) || "Not available",
      raw: row,
    })),
    healthDetails: petRows.map((row) => ({
      pet_name: clean(row["Pet Name"]) || "Not available",
      vaccination_status: clean(row["Vaccination Status"]) || "Not available",
      anti_rabies: clean(row["Anti Rabies"]) || "Not available",
      dhppil: clean(row["DHPPiL (9-in-1)"]) || "Not available",
      corona: clean(row.Corona) || "Not available",
      kennel_cough: clean(row["Kennel Cough"]) || "Not available",
      tick_prevention: clean(row["Tick Prevention"]) || "Not available",
      last_tick_prevention_date: clean(row["Last Tick Prevention Date"]) || "Not available",
      tick_prevention_method: clean(row["Tick Prevention Method"]) || "Not available",
      deworming_date: clean(row["Deworming Date"]) || "Not available",
      ongoing_medication: clean(row["Ongoing Medication"]) || "Not available",
      medication_detail: clean(row["Medication Detail"]) || "Not available",
      major_illness_history: clean(row["Major Illness History"]) || "Not available",
      veterinarian_name: clean(row["Veterinarian Name"]) || "Not available",
      veterinarian_contact: clean(row["Veterinarian Contact"]) || "Not available",
      local_guardian_name: clean(row["Local Guardian Name"]) || "Not available",
      local_guardian_contact: clean(row["Local Guardian Contact"]) || "Not available",
      preferences_or_allergies: clean(row["Preferences Or Allergies"]) || "Not available",
      dietary_preference: clean(row["Dietary Preference"]) || "Not available",
      additional_meals: clean(row["Additional Meals"]) || "Not available",
    })),
    bookingHistory,
    boardingHistory,
    groomingHistory,
    invoices,
    payments: [...paymentsFromInvoices, ...explicitPayments],
    timeline,
    summary,
    rawSources: {
      clients: profile.clients,
      bookings: profile.bookings,
      boarding: profile.boarding,
      grooming: profile.grooming,
      invoices: profile.invoices,
      invoice_breakdown: profile.invoiceBreakdown,
      payments: profile.payments,
    },
  };
}

async function existingMatchCounts(profiles: ProfileDraft[]) {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { phone: { in: profiles.map((p) => p.phone).filter(Boolean) } },
        { email: { in: profiles.map((p) => p.email).filter(Boolean) } },
      ],
    },
    select: { id: true, phone: true, email: true },
  });
  const histories = await prisma.oldClientHistory.findMany({
    where: { client_key: { in: profiles.map((profile) => profile.clientKey) } },
    select: { client_key: true },
  });
  const userKeys = new Set(users.flatMap((user) => [normalizePhone(user.phone), normalizeEmail(user.email)].filter(Boolean)));
  return {
    existingUsers: profiles.filter((profile) => userKeys.has(profile.phone) || userKeys.has(profile.email)).length,
    existingHistories: histories.length,
  };
}

export async function previewOldDataImport(root = OLD_DATA_DEFAULT_ROOT) {
  const data = readOldData(root);
  const profiles = buildProfiles(data);
  const missingPhoneEmail = data.clients.filter((row) => !normalizePhone(row["Phone Number"]) && !normalizeEmail(row.Email)).length;
  const missingPdfInvoices = data.invoices.filter((row) => !data.pdfs.has(clean(row["Invoice No"]))).length;
  const duplicatePossible = profiles.filter((profile) => profile.matchType === "Name + Pet" || profile.matchType === "Parent Name" || profile.matchType === "Missing").length;
  const matches = await existingMatchCounts(profiles);
  const totalPaid = data.invoices.reduce((sum, row) => sum + numberValue(row.Paid), 0);
  const totalDue = data.invoices.reduce((sum, row) => sum + numberValue(row.Due), 0);
  return {
    sourcePath: root,
    totalClientsFound: profiles.length,
    clientRows: data.clients.length,
    newClients: Math.max(0, profiles.length - matches.existingUsers - matches.existingHistories),
    existingMatchedClients: matches.existingUsers + matches.existingHistories,
    duplicatePossibleClients: duplicatePossible,
    totalPets: profiles.reduce((sum, profile) => sum + profile.pets.size, 0),
    totalBookings: data.bookings.length,
    totalBoarding: data.boarding.length,
    totalGrooming: data.grooming.length,
    totalInvoices: data.invoices.length,
    totalExplicitPayments: data.payments.length,
    totalPaidAmount: totalPaid,
    totalDueAmount: totalDue,
    invoicePdfFiles: data.pdfs.size,
    missingPhoneEmailRecords: missingPhoneEmail,
    missingInvoicePdfRecords: missingPdfInvoices,
    sampleDuplicateSuggestions: profiles
      .filter((profile) => profile.matchType === "Name + Pet" || profile.matchType === "Parent Name")
      .slice(0, 10)
      .map((profile) => ({ client: profile.clientName, pets: [...profile.pets.keys()], matchType: profile.matchType })),
  };
}

async function saveInvoicePdf(invoiceNo: string, filePath?: string, skipExistingLookup = false) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  if (!skipExistingLookup) {
    const existing = await prisma.asset.findFirst({
      where: { category: "Old Invoice PDF", original_name: `${invoiceNo}.pdf` },
      orderBy: { created_at: "desc" },
    });
    if (existing) return { assetId: existing.id, path: existing.path };
  }
  const id = new ObjectId().toHexString();
  const filename = `old-invoice-${invoiceNo}-${Date.now()}.pdf`;
  const buffer = fs.readFileSync(filePath);
  const storedPath = await saveGridFsUpload({
    assetId: id,
    filename,
    originalName: `${invoiceNo}.pdf`,
    contentType: "application/pdf",
    buffer,
  });
  const asset = await prisma.asset.create({
    data: {
      id,
      filename,
      original_name: `${invoiceNo}.pdf`,
      path: storedPath,
      category: "Old Invoice PDF",
      document_type: `Invoice ${invoiceNo}`,
      notes: SOURCE,
    },
  });
  return { assetId: asset.id, path: asset.path };
}

async function upsertUserPetRecords(profile: ProfileDraft, mapped: ReturnType<typeof mappedProfile>) {
  const existingHistory = await prisma.oldClientHistory.findUnique({ where: { client_key: profile.clientKey } });
  let user = existingHistory?.client_id ? await prisma.user.findUnique({ where: { id: existingHistory.client_id } }) : null;
  if (!user && profile.email) user = await prisma.user.findUnique({ where: { email: profile.email } });
  if (!user && profile.phone) user = await prisma.user.findFirst({ where: { phone: profile.phone } });
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          name: profile.clientName || undefined,
          email: profile.email || syntheticEmail(profile.clientKey),
          phone: profile.phone || undefined,
          role: "CLIENT",
          wallet_balance: mapped.summary.wallet_balance,
          outstanding_balance: mapped.summary.outstanding_balance,
        },
      });
    } catch (error: any) {
      if (error?.code !== "P2002") throw error;
      user = profile.email ? await prisma.user.findFirst({ where: { email: profile.email } }) : null;
      if (!user && profile.phone) user = await prisma.user.findFirst({ where: { phone: profile.phone } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            name: profile.clientName || undefined,
            email: syntheticEmail(profile.clientKey),
            phone: profile.phone || undefined,
            role: "CLIENT",
            wallet_balance: mapped.summary.wallet_balance,
            outstanding_balance: mapped.summary.outstanding_balance,
          },
        });
      }
    }
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name || profile.clientName || undefined,
        phone: user.phone || profile.phone || undefined,
        wallet_balance: mapped.summary.wallet_balance,
        outstanding_balance: mapped.summary.outstanding_balance,
      },
    });
  }

  if (profile.address) {
    const existingAddress = await prisma.address.findFirst({ where: { user_id: user.id, line1: profile.address } });
    if (!existingAddress) {
      await prisma.address.create({
        data: { user_id: user.id, line1: profile.address, city: "Not available", state: "Gujarat", pincode: "000000", label: "Old Data Import" },
      });
    }
  }

  for (const pet of mapped.petDetails) {
    if (!pet.pet_name || pet.pet_name === "Not available") continue;
    let savedPet = await prisma.pet.findFirst({ where: { owner_id: user.id, name: pet.pet_name } });
    if (!savedPet) {
      savedPet = await prisma.pet.create({
        data: {
          owner_id: user.id,
          name: pet.pet_name,
          type: pet.pet_type === "Not available" ? "Dog" : pet.pet_type,
          breed: pet.breed === "Not available" ? null : pet.breed,
          gender: pet.gender === "Not available" ? null : pet.gender,
          dob: nullableDateObject(pet.birthday),
          coat_type: pet.coat === "Not available" ? null : pet.coat,
          size: pet.breed_size === "Not available" ? null : pet.breed_size,
          weight: Number.parseFloat(String(pet.weight)) || null,
          adoption_status: pet.adoption_status === "Not available" ? null : pet.adoption_status,
          social_handle: pet.pet_social_media === "Not available" ? null : pet.pet_social_media,
          consent_photos: lower(pet.consent_photos) === "yes",
          tc_accepted: true,
        },
      });
    }
    const health = mapped.healthDetails.find((item) => item.pet_name === pet.pet_name);
    if (health) {
      await prisma.petMedical.upsert({
        where: { pet_id: savedPet.id },
        update: {
          vaccination_status: health.vaccination_status === "Not available" ? null : health.vaccination_status,
          tick_method: health.tick_prevention_method === "Not available" ? null : health.tick_prevention_method,
          medication_detail: health.medication_detail === "Not available" ? null : health.medication_detail,
          illness_history: health.major_illness_history === "Not available" ? null : health.major_illness_history,
          vet_name: health.veterinarian_name === "Not available" ? null : health.veterinarian_name,
          vet_contact: health.veterinarian_contact === "Not available" ? null : health.veterinarian_contact,
        },
        create: {
          pet_id: savedPet.id,
          vaccination_status: health.vaccination_status === "Not available" ? null : health.vaccination_status,
          tick_method: health.tick_prevention_method === "Not available" ? null : health.tick_prevention_method,
          medication_detail: health.medication_detail === "Not available" ? null : health.medication_detail,
          illness_history: health.major_illness_history === "Not available" ? null : health.major_illness_history,
          vet_name: health.veterinarian_name === "Not available" ? null : health.veterinarian_name,
          vet_contact: health.veterinarian_contact === "Not available" ? null : health.veterinarian_contact,
        },
      });
    }
  }

  return user.id;
}

export async function runOldDataImport(params: { root?: string; createdBy?: string; importPdfs?: boolean }) {
  const root = params.root || OLD_DATA_DEFAULT_ROOT;
  const job = await prisma.oldDataImportJob.create({
    data: { source_path: root, mode: "Import", status: "Running", created_by: params.createdBy || null },
  });
  try {
    const data = readOldData(root);
    const profiles = buildProfiles(data);
    const pdfAssets = new Map<string, { assetId: string; path: string }>();
    const invoiceNumbers = [...new Set(data.invoices.map((row) => clean(row["Invoice No"])).filter(Boolean))];
    if (params.importPdfs !== false) {
      const existingAssets = await prisma.asset.findMany({
        where: { category: "Old Invoice PDF", original_name: { in: invoiceNumbers.map((invoiceNo) => `${invoiceNo}.pdf`) } },
        select: { id: true, original_name: true, path: true },
      });
      const existingPdfNames = new Set<string>();
      for (const asset of existingAssets) {
        const invoiceNo = asset.original_name.replace(/\.pdf$/i, "");
        existingPdfNames.add(invoiceNo);
        pdfAssets.set(invoiceNo, { assetId: asset.id, path: asset.path });
      }
      const missingInvoices = invoiceNumbers.filter((invoiceNo) => !existingPdfNames.has(invoiceNo));
      const concurrency = 40;
      for (let index = 0; index < missingInvoices.length; index += concurrency) {
        const batch = missingInvoices.slice(index, index + concurrency);
        const saved = await Promise.all(batch.map(async (invoiceNo) => {
          const asset = await saveInvoicePdf(invoiceNo, data.pdfs.get(invoiceNo), true);
          return asset ? [invoiceNo, asset] as const : null;
        }));
        for (const item of saved) {
          if (item) pdfAssets.set(item[0], item[1]);
        }
      }
    }

    let importedProfiles = 0;
    const failed: string[] = [];
    for (const profile of profiles) {
      try {
        const mapped = mappedProfile(profile, data.pdfs, pdfAssets);
        const clientId = await upsertUserPetRecords(profile, mapped);
        await prisma.oldClientHistory.upsert({
          where: { client_key: profile.clientKey },
          update: {
            client_id: clientId,
            client_record_id: null,
            client_name: profile.clientName || null,
            phone: profile.phone || null,
            email: profile.email || null,
            address: profile.address || null,
            pet_names_json: mapped.petDetails.map((pet) => pet.pet_name) as Prisma.InputJsonValue,
            client_details_json: mapped.clientDetails as Prisma.InputJsonValue,
            pet_details_json: mapped.petDetails as Prisma.InputJsonValue,
            health_details_json: mapped.healthDetails as Prisma.InputJsonValue,
            booking_history_json: mapped.bookingHistory as Prisma.InputJsonValue,
            boarding_history_json: mapped.boardingHistory as Prisma.InputJsonValue,
            grooming_history_json: mapped.groomingHistory as Prisma.InputJsonValue,
            invoice_history_json: mapped.invoices as Prisma.InputJsonValue,
            payment_history_json: mapped.payments as Prisma.InputJsonValue,
            timeline_json: mapped.timeline as Prisma.InputJsonValue,
            summary_json: mapped.summary as Prisma.InputJsonValue,
            raw_sources_json: mapped.rawSources as Prisma.InputJsonValue,
            duplicate_notes_json: profile.duplicateNotes as Prisma.InputJsonValue,
            source: SOURCE,
            import_job_id: job.id,
            import_date: new Date(),
          },
          create: {
            client_key: profile.clientKey,
            client_id: clientId,
            client_record_id: null,
            client_name: profile.clientName || null,
            phone: profile.phone || null,
            email: profile.email || null,
            address: profile.address || null,
            pet_names_json: mapped.petDetails.map((pet) => pet.pet_name) as Prisma.InputJsonValue,
            client_details_json: mapped.clientDetails as Prisma.InputJsonValue,
            pet_details_json: mapped.petDetails as Prisma.InputJsonValue,
            health_details_json: mapped.healthDetails as Prisma.InputJsonValue,
            booking_history_json: mapped.bookingHistory as Prisma.InputJsonValue,
            boarding_history_json: mapped.boardingHistory as Prisma.InputJsonValue,
            grooming_history_json: mapped.groomingHistory as Prisma.InputJsonValue,
            invoice_history_json: mapped.invoices as Prisma.InputJsonValue,
            payment_history_json: mapped.payments as Prisma.InputJsonValue,
            timeline_json: mapped.timeline as Prisma.InputJsonValue,
            summary_json: mapped.summary as Prisma.InputJsonValue,
            raw_sources_json: mapped.rawSources as Prisma.InputJsonValue,
            duplicate_notes_json: profile.duplicateNotes as Prisma.InputJsonValue,
            source: SOURCE,
            import_job_id: job.id,
          },
        });
        importedProfiles++;
      } catch (error) {
        failed.push(`${profile.clientName || profile.clientKey}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const summary = await previewOldDataImport(root);
    const report = {
      importedProfiles,
      failedProfiles: failed.length,
      failed: failed.slice(0, 100),
      pdfAssetsImported: pdfAssets.size,
      invoiceCount: invoiceNumbers.length,
    };
    await prisma.oldDataImportJob.update({
      where: { id: job.id },
      data: {
        status: failed.length ? "Completed With Warnings" : "Completed",
        summary_json: summary as Prisma.InputJsonValue,
        report_json: report as Prisma.InputJsonValue,
      },
    });
    return { jobId: job.id, summary, report };
  } catch (error) {
    await prisma.oldDataImportJob.update({
      where: { id: job.id },
      data: { status: "Failed", error_message: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}
