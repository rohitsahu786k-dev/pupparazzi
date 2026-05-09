import { NextResponse } from "next/server";
import { recordSuccessfulOnlinePayment } from "@/lib/payment-invoices";

export const runtime = "nodejs";

function authorized(req: Request) {
  const secret = process.env.GOKWIK_WEBHOOK_SECRET;
  if (!secret) return true;
  return req.headers.get("x-gokwik-secret") === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const bookingId = String(body.bookingId || body.order?.bookingId || "");
  const clientId = String(body.clientId || body.customer?.id || "");
  const amount = Number(body.amount || body.payment?.amount || 100);
  const transactionId = String(body.transactionId || body.gokwikOrderId || body.order_id || "");

  if (!bookingId || !clientId || !transactionId) {
    return NextResponse.json({ message: "bookingId, clientId and transactionId are required" }, { status: 400 });
  }

  const result = await recordSuccessfulOnlinePayment({
    bookingId,
    clientId,
    amount,
    transactionId,
    source: "GoKwik",
    mode: "Advance Online",
    paymentType: "advance",
  });

  return NextResponse.json({ message: "GoKwik payment verified", ...result });
}
