import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { sendWelcomeEmail } from "@/lib/mailer";

const roles = ["CLIENT", "STAFF", "ADMIN"];

function cleanEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function cleanRole(value: unknown) {
  const role = String(value || "CLIENT").toUpperCase();
  return roles.includes(role) ? role : "";
}

function publicUserSelect() {
  return {
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
    staffProfile: { select: { id: true, role: true, services_json: true, working_hours_json: true } },
  } as const;
}

async function syncStaffProfile(userId: string, role: string) {
  if (role === "STAFF") {
    await prisma.staff.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId, role: "Staff" },
    });
  } else {
    await prisma.staff.deleteMany({ where: { user_id: userId } });
  }
}

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
    select: publicUserSelect(),
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const email = cleanEmail(body.email);
  const password = String(body.password || "");
  const role = cleanRole(body.role);
  if (!email || !password || !body.name) {
    return NextResponse.json({ message: "Name, email, and password are required" }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ message: "Valid email is required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ message: "Invalid role" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ message: "User already exists" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email,
      phone: body.phone || undefined,
      role: role as any,
      password_hash: await bcrypt.hash(password, 10),
      emailVerified: new Date(),
      is_active: body.is_active ?? true,
    },
  });
  await syncStaffProfile(user.id, role);

  sendWelcomeEmail(email, { userName: user.name || "there", email }).catch(console.error);
  const created = await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect() });
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ message: "User ID is required" }, { status: 400 });
  const existing = await prisma.user.findUnique({ where: { id: body.id } });
  if (!existing) return NextResponse.json({ message: "User not found" }, { status: 404 });
  const nextRole = body.role !== undefined ? cleanRole(body.role) : undefined;
  if (body.role !== undefined && !nextRole) return NextResponse.json({ message: "Invalid role" }, { status: 400 });
  if (body.id === session.user.id && (body.is_active === false || (nextRole && nextRole !== "ADMIN"))) {
    return NextResponse.json({ message: "You cannot remove admin access from your own account" }, { status: 400 });
  }

  const nextEmail = body.email !== undefined ? cleanEmail(body.email) : undefined;
  if (nextEmail !== undefined) {
    if (!nextEmail.includes("@")) return NextResponse.json({ message: "Valid email is required" }, { status: 400 });
    const duplicate = await prisma.user.findUnique({ where: { email: nextEmail } });
    if (duplicate && duplicate.id !== body.id) return NextResponse.json({ message: "Email is already used by another account" }, { status: 409 });
  }

  const data: any = {
    ...(body.name !== undefined ? { name: String(body.name).trim() || null } : {}),
    ...(nextEmail !== undefined ? { email: nextEmail } : {}),
    ...(body.phone !== undefined ? { phone: String(body.phone).trim() || null } : {}),
    ...(nextRole !== undefined ? { role: nextRole } : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    ...(body.wallet_balance !== undefined ? { wallet_balance: Number(body.wallet_balance) } : {}),
    ...(body.outstanding_balance !== undefined ? { outstanding_balance: Number(body.outstanding_balance) } : {}),
    ...(body.emailVerified === true ? { emailVerified: new Date() } : {}),
    ...(body.emailVerified === false ? { emailVerified: null } : {}),
  };
  if (body.password) {
    const password = String(body.password);
    if (password.length < 6) return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    data.password_hash = await bcrypt.hash(password, 10);
  }

  const user = await prisma.user.update({
    where: { id: body.id },
    data,
    select: publicUserSelect(),
  });
  if (nextRole) await syncStaffProfile(user.id, nextRole);
  return NextResponse.json(user);
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "User ID is required" }, { status: 400 });
  if (id === session.user.id) return NextResponse.json({ message: "You cannot delete your own admin account" }, { status: 400 });

  const linkedRecords = await prisma.booking.count({ where: { client_id: id } });
  const payments = await prisma.payment.count({ where: { client_id: id } });
  if (linkedRecords > 0 || payments > 0) {
    await prisma.user.update({ where: { id }, data: { is_active: false } });
    return NextResponse.json({ message: "User has bookings/payments, so the account was disabled instead of deleted" });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ message: "User deleted" });
}
