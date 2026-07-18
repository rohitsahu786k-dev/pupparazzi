import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEmailOtp } from "@/lib/email-verification";
import { sendWelcomeEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !otp) {
      return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 });
    }

    const isValid = await verifyEmailOtp(normalizedEmail, String(otp));
    if (!isValid) {
      return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { email: normalizedEmail },
      data: { emailVerified: new Date(), account_state: "Account activated", portal_activated_at: new Date() },
    });

    sendWelcomeEmail(normalizedEmail, {
      userName: user.name || "there",
      email: normalizedEmail,
    }).catch(console.error);

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ message: "Unable to verify email" }, { status: 500 });
  }
}
