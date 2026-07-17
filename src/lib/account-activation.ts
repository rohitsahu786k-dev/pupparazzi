import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/booking-detail-forms";

export const RESET_TTL_MINUTES = 30;

export function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function resetIdentifierFor(email: string) {
  return `password-reset:${email}`;
}

export async function createPasswordSetupLink(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.deleteMany({ where: { identifier: resetIdentifierFor(normalizedEmail) } });
  await prisma.verificationToken.create({
    data: {
      identifier: resetIdentifierFor(normalizedEmail),
      token: await bcrypt.hash(token, 10),
      expires: new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000),
    },
  });
  return {
    tokenReference: resetIdentifierFor(normalizedEmail),
    url: `${SITE_URL}/reset-password?email=${encodeURIComponent(normalizedEmail)}&token=${encodeURIComponent(token)}`,
    expiresMinutes: RESET_TTL_MINUTES,
  };
}
