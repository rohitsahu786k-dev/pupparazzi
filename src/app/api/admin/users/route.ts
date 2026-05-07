import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { sendWelcomeEmail } from "@/lib/mailer";

const roles = ["CLIENT", "STAFF", "ADMIN"];

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const q = searchParams.get("q")?.trim();
  const users = await prisma.user.findMany({
    where: {
      ...(role && role !== "All" ? { role: role as any } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      is_active: true,
      emailVerified: true,
      wallet_balance: true,
      outstanding_balance: true,
      created_at: true,
      pets: { select: { id: true, name: true, type: true } },
      clientBookings: { select: { id: true, status: true, payment_status: true } },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password || !body.name) {
    return NextResponse.json({ message: "Name, email, and password are required" }, { status: 400 });
  }
  if (!roles.includes(body.role || "CLIENT")) {
    return NextResponse.json({ message: "Invalid role" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ message: "User already exists" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email,
      phone: body.phone || undefined,
      role: body.role || "CLIENT",
      password_hash: await bcrypt.hash(password, 10),
      emailVerified: new Date(),
      is_active: body.is_active ?? true,
    },
  });

  sendWelcomeEmail(email, { userName: user.name || "there", email }).catch(console.error);
  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ message: "User ID is required" }, { status: 400 });
  if (body.role && !roles.includes(body.role)) return NextResponse.json({ message: "Invalid role" }, { status: 400 });

  const data: any = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.phone !== undefined ? { phone: body.phone } : {}),
    ...(body.role !== undefined ? { role: body.role } : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    ...(body.wallet_balance !== undefined ? { wallet_balance: Number(body.wallet_balance) } : {}),
    ...(body.outstanding_balance !== undefined ? { outstanding_balance: Number(body.outstanding_balance) } : {}),
    ...(body.emailVerified === true ? { emailVerified: new Date() } : {}),
  };
  if (body.password) data.password_hash = await bcrypt.hash(String(body.password), 10);

  const user = await prisma.user.update({
    where: { id: body.id },
    data,
    select: { id: true, name: true, email: true, phone: true, role: true, is_active: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "User ID is required" }, { status: 400 });
  if (id === session.user.id) return NextResponse.json({ message: "You cannot delete your own admin account" }, { status: 400 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ message: "User deleted" });
}
