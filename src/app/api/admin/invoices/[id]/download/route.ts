import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/invoice";
import { formatBookingDate } from "@/lib/booking-lifecycle";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { client: true, booking: { include: { service: true, pet: true, address: true } } },
  });
  if (!invoice) return NextResponse.json({ message: "Invoice not found" }, { status: 404 });

  const pdf = generateInvoicePdf({
    invoiceNumber: invoice.invoice_id,
    invoiceDate: invoice.created_at.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    bookingId: invoice.booking?.booking_id || "-",
    customerName: invoice.client?.name || "Customer",
    customerEmail: invoice.client?.email || "",
    customerPhone: invoice.client?.phone || undefined,
    customerAddress: invoice.booking?.address ? `${invoice.booking.address.line1}, ${invoice.booking.address.city}` : undefined,
    serviceName: invoice.booking?.service?.name || "Pet Service",
    petName: invoice.booking?.pet?.name || "Pet",
    slotDate: invoice.booking?.slot_date ? formatBookingDate(invoice.booking.slot_date) : "-",
    slotTime: invoice.booking?.slot_time || "",
    quantity: 1,
    unitPrice: Number(invoice.total || 0),
    gstRate: 0,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoice_id}.pdf"`,
    },
  });
}
