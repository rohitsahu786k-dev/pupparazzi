import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { createPasswordSetupLink, normalizeEmail } from "@/lib/account-activation";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return NextResponse.json({ message: "If the account exists, a reset link will be sent." });
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user?.is_active && user.password_hash) {
      const link = await createPasswordSetupLink(normalizedEmail);
      sendPasswordResetEmail(normalizedEmail, { userName: user.name || "there", resetUrl: link.url }).catch(console.error);
    }

    return NextResponse.json({ message: "If the account exists, a reset link will be sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Unable to process password reset" }, { status: 500 });
  }
}
