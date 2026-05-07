import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { sendMail } from "@/lib/mailer";

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { to } = await req.json();
  if (!to) return NextResponse.json({ message: "Recipient email is required" }, { status: 400 });

  const result = await sendMail({
    to,
    subject: "Pupparazzi SMTP test email",
    html: "<p>Your SMTP settings are working.</p>",
  });

  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
