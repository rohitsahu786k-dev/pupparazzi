import { jsPDF } from "jspdf";
import { BUSINESS } from "./mailer";

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  serviceName: string;
  petName: string;
  slotDate: string;
  slotTime: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  gstRate?: number;
}

export function generateInvoicePdf(data: InvoiceData): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  const PW = 210; // page width
  const PH = 297; // page height
  const gstRate = data.gstRate ?? 18;
  const subtotal = data.unitPrice * data.quantity;
  const gstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
  const cgst = parseFloat((gstAmount / 2).toFixed(2));
  const sgst = parseFloat((gstAmount / 2).toFixed(2));
  const total = parseFloat((subtotal + gstAmount).toFixed(2));

  // ── Color palette ────────────────────────────────────────────
  const C = {
    dark:    { r: 15,  g: 23,  b: 42  },   // slate-900
    medium:  { r: 30,  g: 41,  b: 59  },   // slate-800
    slate6:  { r: 71,  g: 85,  b: 105 },   // slate-600
    slate5:  { r: 100, g: 116, b: 139 },   // slate-500
    slate3:  { r: 148, g: 163, b: 184 },   // slate-400
    light:   { r: 248, g: 250, b: 252 },   // slate-50
    border:  { r: 226, g: 232, b: 240 },   // slate-200
    pink:    { r: 236, g: 72,  b: 153 },   // pink-500
    orange:  { r: 249, g: 115, b: 22  },   // orange-500
    green:   { r: 16,  g: 185, b: 129 },   // emerald-500
    greenBg: { r: 240, g: 253, b: 244 },   // emerald-50
    white:   { r: 255, g: 255, b: 255 },
    pinkLight:{ r: 253, g: 242, b: 248 },  // pink-50
  };

  type Color = { r: number; g: number; b: number };
  const fill  = (c: Color) => doc.setFillColor(c.r, c.g, c.b);
  const text  = (c: Color) => doc.setTextColor(c.r, c.g, c.b);
  const draw  = (c: Color) => doc.setDrawColor(c.r, c.g, c.b);

  // ── Background ───────────────────────────────────────────────
  fill(C.white);
  doc.rect(0, 0, PW, PH, "F");

  // ── Top header band ──────────────────────────────────────────
  fill(C.dark);
  doc.rect(0, 0, PW, 52, "F");

  // Pink accent stripe
  fill(C.pink);
  doc.rect(0, 52, PW, 3, "F");

  // ── Logo / Company name ──────────────────────────────────────
  text(C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(BUSINESS.name, 16, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  text(C.slate3);
  const addrLines = doc.splitTextToSize(BUSINESS.address, 130) as string[];
  doc.text(addrLines, 16, 28);
  doc.text(`GSTIN: ${BUSINESS.gst}  |  ${BUSINESS.email}`, 16, 43);

  // ── TAX INVOICE badge ────────────────────────────────────────
  // Gradient-like effect: draw two rects slightly offset
  fill(C.pink);
  doc.roundedRect(145, 10, 52, 10, 2, 2, "F");
  fill(C.orange);
  doc.roundedRect(145, 20, 52, 20, 2, 2, "F");
  fill(C.pink);
  doc.roundedRect(145, 10, 52, 20, 2, 2, "F");

  text(C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("TAX INVOICE", 171, 22, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("ORIGINAL FOR RECIPIENT", 171, 30, { align: "center" });

  // ── Meta row ─────────────────────────────────────────────────
  let y = 55;
  fill(C.light);
  doc.rect(0, y, PW, 28, "F");

  text(C.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Invoice No.:`, 16, y + 9);
  doc.text(`Booking ID:`, 16, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.invoiceNumber, 48, y + 9);
  doc.text(data.bookingId, 48, y + 18);

  doc.setFont("helvetica", "bold");
  doc.text(`Invoice Date:`, PW - 80, y + 9);
  doc.text(`Service Date:`, PW - 80, y + 18);
  doc.setFont("helvetica", "normal");
  doc.text(data.invoiceDate, PW - 16, y + 9, { align: "right" });
  doc.text(data.slotDate, PW - 16, y + 18, { align: "right" });

  // ── Bill To / Service Details cards ──────────────────────────
  y = 98;

  // Bill To card
  fill(C.light);
  draw(C.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(16, y, 84, 58, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  text(C.slate5);
  doc.text("BILL TO", 22, y + 9);

  draw(C.pink);
  doc.setLineWidth(0.8);
  doc.line(22, y + 11, 38, y + 11);

  text(C.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(data.customerName, 22, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  text(C.slate6);
  doc.text(data.customerEmail, 22, y + 29);
  if (data.customerPhone) doc.text(data.customerPhone, 22, y + 37);
  if (data.customerAddress) {
    const addrLines2 = doc.splitTextToSize(data.customerAddress, 72) as string[];
    doc.text(addrLines2, 22, y + (data.customerPhone ? 45 : 37));
  }

  // Service Details card
  fill(C.light);
  draw(C.border);
  doc.roundedRect(110, y, 84, 58, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  text(C.slate5);
  doc.text("SERVICE DETAILS", 116, y + 9);

  draw(C.pink);
  doc.setLineWidth(0.8);
  doc.line(116, y + 11, 144, y + 11);

  const rows2 = [
    ["Service", data.serviceName],
    ["Pet Name", data.petName],
    ["Time Slot", data.slotTime],
  ];
  rows2.forEach(([lbl, val], i) => {
    const ry = y + 20 + i * 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    text(C.slate5);
    doc.text(lbl + ":", 116, ry);
    doc.setFont("helvetica", "bold");
    text(C.dark);
    doc.text(val, 138, ry);
  });

  // ── Items Table ───────────────────────────────────────────────
  y = 172;

  // Table header
  fill(C.dark);
  doc.rect(16, y, 178, 10, "F");
  text(C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("#",         20, y + 7);
  doc.text("Description", 28, y + 7);
  doc.text("HSN/SAC",   108, y + 7, { align: "right" });
  doc.text("Qty",       130, y + 7, { align: "right" });
  doc.text("Rate (₹)",  155, y + 7, { align: "right" });
  doc.text("Amount (₹)", 192, y + 7, { align: "right" });

  // Table row
  y += 10;
  fill(C.pinkLight);
  doc.rect(16, y, 178, 14, "F");
  draw(C.border);
  doc.setLineWidth(0.2);
  doc.rect(16, y, 178, 14, "D");

  text(C.dark);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("1", 20, y + 9);
  const desc = data.description || `${data.serviceName} for ${data.petName}`;
  const descLines = doc.splitTextToSize(desc, 76) as string[];
  doc.text(descLines, 28, y + 9);
  text(C.slate5);
  doc.setFontSize(8);
  doc.text("998511", 108, y + 9, { align: "right" });
  text(C.dark);
  doc.setFontSize(9);
  doc.text(String(data.quantity), 130, y + 9, { align: "right" });
  doc.text(data.unitPrice.toFixed(2), 155, y + 9, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(subtotal.toFixed(2), 192, y + 9, { align: "right" });

  // GST note row
  y += 14;
  fill(C.light);
  doc.rect(16, y, 178, 8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  text(C.slate5);
  doc.text("GST Rate: 18%  (CGST 9% + SGST 9%)  |  Place of Supply: Gujarat (24)", 20, y + 5.5);

  // ── Totals ────────────────────────────────────────────────────
  y += 16;
  const TX = 120; // totals block left edge
  const VX = 192; // value right edge

  function tRow(label: string, value: string, bold = false) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 9);
    text(bold ? C.dark : C.slate6);
    doc.text(label, TX, y);
    text(bold ? C.dark : C.slate5);
    doc.text(value, VX, y, { align: "right" });
    y += 9;
  }

  draw(C.border);
  doc.setLineWidth(0.4);
  doc.line(TX, y - 3, VX, y - 3);

  tRow("Subtotal",   `₹ ${subtotal.toFixed(2)}`);
  tRow("CGST (9%)",  `₹ ${cgst.toFixed(2)}`);
  tRow("SGST (9%)",  `₹ ${sgst.toFixed(2)}`);

  draw(C.border);
  doc.setLineWidth(0.4);
  doc.line(TX, y - 2, VX, y - 2);
  y += 2;

  // Total row with highlight
  fill(C.dark);
  doc.roundedRect(TX - 4, y - 4, VX - TX + 8, 13, 2, 2, "F");
  text(C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL AMOUNT", TX, y + 5);
  doc.text(`₹ ${total.toFixed(2)}`, VX, y + 5, { align: "right" });
  y += 18;

  // ── Payment Status ────────────────────────────────────────────
  fill(C.greenBg);
  draw(C.green);
  doc.setLineWidth(0.5);
  doc.roundedRect(16, y, 100, 14, 3, 3, "FD");
  text(C.green);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("✓  PAYMENT CONFIRMED", 22, y + 9);

  // ── Separator line ────────────────────────────────────────────
  const footerY = PH - 36;
  draw(C.pink);
  doc.setLineWidth(1.5);
  doc.line(16, footerY, PW - 16, footerY);

  // ── Footer ────────────────────────────────────────────────────
  text(C.slate5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Thank you for choosing Pupparazzi! 🐾", PW / 2, footerY + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  text(C.slate3);
  doc.text(`${BUSINESS.name}  ·  ${BUSINESS.email}`, PW / 2, footerY + 15, { align: "center" });
  doc.setFontSize(7);
  doc.text("This is a computer-generated invoice and does not require a physical signature.", PW / 2, footerY + 22, { align: "center" });

  return Buffer.from(doc.output("arraybuffer"));
}
