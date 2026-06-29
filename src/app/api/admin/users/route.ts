import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { sendWelcomeEmail } from "@/lib/mailer";
import { deleteUserCascade } from "@/lib/delete-records";

const roles = ["CLIENT", "STAFF", "ADMIN"];

function cleanEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanRole(value: unknown) {
  const role = String(value || "CLIENT").toUpperCase();
  return roles.includes(role) ? role : "";
}

function syntheticClientEmail(seed: string) {
  const safeSeed = seed.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return `client-${safeSeed || Date.now()}-${Math.random().toString(36).slice(2, 8)}@client.local`;
}

function phoneKey(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function publicUserSelect(): Prisma.UserSelect {
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
    addresses: { select: { id: true, label: true, line1: true, city: true, state: true, pincode: true, phone: true, is_default: true } },
    pets: { orderBy: { created_at: "desc" }, select: { id: true, name: true, type: true, breed: true, weight: true, medical: { select: { vaccination_status: true } } } },
    clientBookings: { orderBy: [{ slot_date: "desc" }, { created_at: "desc" }], take: 25, select: { id: true, booking_id: true, status: true, payment_status: true, slot_date: true } },
    staffProfile: { select: { id: true, role: true, services_json: true, working_hours_json: true } },
  };
}

function compactClientSelect(): Prisma.UserSelect {
  return {
    id: true,
    name: true,
    email: true,
    phone: true,
    created_at: true,
    addresses: { select: { id: true, label: true, line1: true, city: true, state: true, pincode: true, phone: true, is_default: true } },
    pets: { orderBy: { created_at: "desc" }, select: { id: true, name: true, type: true, breed: true, weight: true } },
    clientBookings: {
      orderBy: [{ slot_date: "desc" }, { created_at: "desc" }],
      take: 10,
      select: {
        id: true,
        booking_id: true,
        status: true,
        payment_status: true,
        slot_date: true,
        slot_time: true,
        service: { select: { name: true, category: true } },
        pet: { select: { name: true, type: true } },
      },
    },
  };
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
  const pet = searchParams.get("pet")?.trim();
  const phone = searchParams.get("phone")?.trim();
  const email = searchParams.get("email")?.trim();
  const history = searchParams.get("history") || "All";
  const balance = searchParams.get("balance") || "All";
  const compact = searchParams.get("compact") === "true";
  const and: any[] = [];
  const qOr: any[] = [];

  if (role && role !== "All") and.push({ role: role as any });
  if (phone) and.push({ phone: { contains: phone } });
  if (email) and.push({ email: { contains: email } });
  if (pet) {
    and.push({
      pets: {
        some: {
          OR: [
            { name: { contains: pet, mode: "insensitive" } },
            { type: { contains: pet, mode: "insensitive" } },
            { breed: { contains: pet, mode: "insensitive" } },
          ],
        },
      },
    });
  }
  if (balance === "Outstanding") and.push({ outstanding_balance: { gt: 0 } });
  if (balance === "Wallet") and.push({ wallet_balance: { gt: 0 } });

  let importedClientIds: string[] = [];
  let allImportedClientIds: string[] = [];
  if (q || history !== "All") {
    const histories = await prisma.oldClientHistory.findMany({
      where: q
        ? {
            OR: [
              { client_name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
              { email: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      select: { client_id: true },
    });
    importedClientIds = Array.from(new Set(histories.map((item) => item.client_id).filter(Boolean) as string[]));
    if (history === "No imported history") {
      const allHistories = await prisma.oldClientHistory.findMany({ select: { client_id: true } });
      allImportedClientIds = Array.from(new Set(allHistories.map((item) => item.client_id).filter(Boolean) as string[]));
    }
  }

  if (q) {
    qOr.push(
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { pets: { some: { OR: [{ name: { contains: q, mode: "insensitive" } }, { breed: { contains: q, mode: "insensitive" } }] } } },
      { addresses: { some: { OR: [{ line1: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { pincode: { contains: q } }] } } },
    );
    if (importedClientIds.length) qOr.push({ id: { in: importedClientIds } });
    and.push({ OR: qOr });
  }
  if (history === "Imported") and.push({ id: { in: importedClientIds } });
  if (history === "No imported history") and.push({ id: { notIn: allImportedClientIds } });

  const users = await prisma.user.findMany({
    where: and.length ? { AND: and } : {},
    select: compact ? compactClientSelect() : publicUserSelect(),
    orderBy: { created_at: "desc" },
  });

  if (compact) {
    return NextResponse.json(users);
  }

  const userIds = users.map((user) => user.id);
  const userPhones = Array.from(new Set(users.map((user) => user.phone).filter(Boolean) as string[]));
  const userEmails = Array.from(new Set(users.map((user) => user.email).filter(Boolean) as string[]));
  const histories = userIds.length
    ? await prisma.oldClientHistory.findMany({
        where: {
          OR: [
            { client_id: { in: userIds } },
            ...(userPhones.length ? [{ phone: { in: userPhones } }] : []),
            ...(userEmails.length ? [{ email: { in: userEmails } }] : []),
          ],
        },
        select: {
          id: true,
          client_id: true,
          client_name: true,
          phone: true,
          email: true,
          address: true,
          pet_names_json: true,
          summary_json: true,
          import_date: true,
        },
      })
    : [];
  const historyByClient = new Map(histories.filter((item) => item.client_id).map((item) => [item.client_id, item]));
  const historyByPhone = new Map(histories.filter((item) => phoneKey(item.phone)).map((item) => [phoneKey(item.phone), item]));
  const historyByEmail = new Map(histories.filter((item) => item.email).map((item) => [String(item.email).toLowerCase(), item]));

  return NextResponse.json(users.map((user) => ({
    ...user,
    oldHistory:
      historyByClient.get(user.id)
      || historyByPhone.get(phoneKey(user.phone))
      || (user.email ? historyByEmail.get(user.email.toLowerCase()) : null)
      || null,
  })));
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const realEmail = cleanEmail(body.email);
  const password = String(body.password || "");
  const role = cleanRole(body.role);
  const name = cleanText(body.name);
  const phone = cleanText(body.phone);
  const isClient = role === "CLIENT";
  if (!role) {
    return NextResponse.json({ message: "Invalid role" }, { status: 400 });
  }
  if (!name || (!isClient && (!realEmail || !password))) {
    return NextResponse.json({ message: isClient ? "Name and phone/email are required" : "Name, email, and password are required" }, { status: 400 });
  }
  if (isClient && !phone && !realEmail) {
    return NextResponse.json({ message: "Phone or email is required for a client" }, { status: 400 });
  }
  if (realEmail && !realEmail.includes("@")) {
    return NextResponse.json({ message: "Valid email is required" }, { status: 400 });
  }
  if (!isClient && password.length < 6) {
    return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
  }

  const email = realEmail || syntheticClientEmail(phone || name);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ message: "User already exists" }, { status: 409 });
  if (phone) {
    const duplicatePhone = await prisma.user.findFirst({ where: { phone, role: "CLIENT" } });
    if (duplicatePhone) return NextResponse.json({ message: "A client with this phone already exists", user: duplicatePhone }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || undefined,
      role: role as any,
      password_hash: password ? await bcrypt.hash(password, 10) : undefined,
      emailVerified: realEmail ? new Date() : null,
      is_active: body.is_active ?? true,
    },
  });
  await syncStaffProfile(user.id, role);

  if (realEmail && (password || isClient)) {
    sendWelcomeEmail(realEmail, { userName: user.name || "there", email: realEmail, password: password || undefined, role: role as any }).catch(console.error);
  }
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
    if (!nextEmail) {
      delete body.email;
    } else {
    if (!nextEmail.includes("@")) return NextResponse.json({ message: "Valid email is required" }, { status: 400 });
    const duplicate = await prisma.user.findUnique({ where: { email: nextEmail } });
    if (duplicate && duplicate.id !== body.id) return NextResponse.json({ message: "Email is already used by another account" }, { status: 409 });
    }
  }

  const data: any = {
    ...(body.name !== undefined ? { name: String(body.name).trim() || null } : {}),
    ...(nextEmail ? { email: nextEmail } : {}),
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

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  const result = await deleteUserCascade(id);
  return NextResponse.json({
    message: "User deleted",
    bookingsDeleted: result.bookingsDeleted,
    assetsDeleted: result.assetsDeleted,
  });
}
