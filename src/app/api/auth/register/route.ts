import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendVerificationOtp } from "@/lib/email-verification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, password } = body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password || !name) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser?.emailVerified) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: { name, email: normalizedEmail, phone, password_hash: hashedPassword, account_state: "Portal invite pending" },
        })
      : await prisma.user.create({
          data: { name, email: normalizedEmail, phone, password_hash: hashedPassword, account_state: "Portal invite pending" },
        });

    await sendVerificationOtp(normalizedEmail, name);
    return NextResponse.json(
      { message: "Verification OTP sent to your email", user: { id: user.id, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
