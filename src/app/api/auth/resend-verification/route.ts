import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationOtp } from "@/lib/email-verification";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return NextResponse.json({ message: "Account not found" }, { status: 404 });
    }
    if (user.emailVerified) {
      return NextResponse.json({ message: "Email is already verified" }, { status: 400 });
    }

    await sendVerificationOtp(normalizedEmail, user.name);
    return NextResponse.json({ message: "Verification OTP sent" });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ message: "Unable to send OTP" }, { status: 500 });
  }
}
