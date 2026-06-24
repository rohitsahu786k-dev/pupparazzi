import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/booking-detail-forms";
import { sendPasswordResetEmail } from "@/lib/mailer";

const RESET_TTL_MINUTES = 30;

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function identifierFor(email: string) {
  return `password-reset:${email}`;
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return NextResponse.json({ message: "If the account exists, a reset link will be sent." });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user?.is_active && user.password_hash) {
      const token = randomBytes(32).toString("hex");
      await prisma.verificationToken.deleteMany({ where: { identifier: identifierFor(normalizedEmail) } });
      await prisma.verificationToken.create({
        data: {
          identifier: identifierFor(normalizedEmail),
          token: await bcrypt.hash(token, 10),
          expires: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
        },
      });
      const resetUrl = `${SITE_URL}/reset-password?email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(token)}`;
      sendPasswordResetEmail(normalizedEmail, { userName: user.name || "there", resetUrl }).catch(console.error);
    }

    return NextResponse.json({ message: "If the account exists, a reset link will be sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Unable to process password reset" }, { status: 500 });
  }
}
