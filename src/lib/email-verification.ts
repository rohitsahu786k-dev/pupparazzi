import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmailVerificationOtp } from "@/lib/mailer";

const OTP_TTL_MINUTES = 10;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function identifierFor(email: string) {
  return `email-verification:${normalizeEmail(email)}`;
}

export async function sendVerificationOtp(email: string, userName?: string | null) {
  const normalizedEmail = normalizeEmail(email);
  const otp = randomInt(100000, 1000000).toString();
  const token = await bcrypt.hash(otp, 10);
  const expires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.verificationToken.deleteMany({
    where: { identifier: identifierFor(normalizedEmail) },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: identifierFor(normalizedEmail),
      token,
      expires,
    },
  });

  await sendEmailVerificationOtp(normalizedEmail, {
    userName: userName || "there",
    otp,
  });
}

export async function verifyEmailOtp(email: string, otp: string) {
  const normalizedEmail = normalizeEmail(email);
  const records = await prisma.verificationToken.findMany({
    where: {
      identifier: identifierFor(normalizedEmail),
      expires: { gt: new Date() },
    },
  });

  for (const record of records) {
    if (await bcrypt.compare(otp.trim(), record.token)) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: identifierFor(normalizedEmail) },
      });
      return true;
    }
  }

  return false;
}
