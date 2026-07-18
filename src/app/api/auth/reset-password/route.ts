import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendPasswordUpdatedEmail } from "@/lib/mailer";
import { normalizeEmail, resetIdentifierFor } from "@/lib/account-activation";

export async function POST(req: Request) {
  try {
    const { email, token, password } = await req.json();
    const normalizedEmail = normalizeEmail(email);
    const nextPassword = String(password || "");
    if (!normalizedEmail || !token || nextPassword.length < 8) {
      return NextResponse.json({ message: "A valid reset link and an 8+ character password are required" }, { status: 400 });
    }

    const records = await prisma.verificationToken.findMany({
      where: {
        identifier: resetIdentifierFor(normalizedEmail),
        expires: { gt: new Date() },
      },
    });

    let matched = false;
    for (const record of records) {
      if (await bcrypt.compare(String(token), record.token)) {
        matched = true;
        break;
      }
    }

    if (!matched) {
      return NextResponse.json({ message: "Reset link is invalid or expired" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        password_hash: await bcrypt.hash(nextPassword, 10),
        emailVerified: new Date(),
        account_state: "Password configured",
        portal_activated_at: new Date(),
      },
    });
    await prisma.emailCampaignRecipient.updateMany({
      where: { customer_id: user.id, status: "Sent" },
      data: { status: "Activated", activation_status: "Password configured" },
    });
    await prisma.verificationToken.deleteMany({ where: { identifier: resetIdentifierFor(normalizedEmail) } });
    await prisma.session.deleteMany({ where: { userId: user.id } });

    // The user chose this password themselves, so we confirm the change and remind
    // them of their login ID without echoing the password back into their inbox.
    sendPasswordUpdatedEmail(normalizedEmail, {
      userName: user.name || "there",
      email: normalizedEmail,
      role: (user.role || "CLIENT") as "CLIENT" | "STAFF" | "ADMIN",
      changedByAdmin: false,
    }).catch(console.error);

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Unable to reset password" }, { status: 500 });
  }
}
