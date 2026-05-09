import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function canManage(role?: string | null) {
  return role === "ADMIN" || role === "STAFF";
}

function cleanList(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split("\n").map((item) => item.trim()).filter(Boolean);
  return [];
}

function cleanAddons(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((addon: any) => ({
      name: String(addon.name || "").trim(),
      description: addon.description ? String(addon.description).trim() : null,
      price: Number(addon.price || 0),
      is_active: addon.is_active !== false,
    }))
    .filter((addon) => addon.name && addon.price >= 0);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    if (includeInactive) {
      const session = await getServerSession(authOptions);
      if (!canManage(session?.user?.role)) {
        return NextResponse.json({ message: "Admin access required" }, { status: 403 });
      }
    }

    const services = await prisma.service.findMany({
      where: includeInactive ? {} : { is_active: true },
      include: { addons: includeInactive ? true : { where: { is_active: true } } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch services" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!canManage(session?.user?.role)) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const addons = cleanAddons(body.addons);
    const includes = cleanList(body.free_services_json);
    const images = cleanList(body.images_json);
    const service = await prisma.service.create({
      data: {
        name: String(body.name || "").trim(),
        category: String(body.category || "Grooming").trim(),
        description_short: body.description_short || null,
        description_long: body.description_long || null,
        price: Number(body.price || 0),
        discounted_price: body.discounted_price === "" || body.discounted_price == null ? null : Number(body.discounted_price),
        slot_duration_mins: Number(body.slot_duration_mins || 60),
        max_slots_per_day: body.max_slots_per_day === "" || body.max_slots_per_day == null ? null : Number(body.max_slots_per_day),
        is_active: body.is_active !== false,
        is_coming_soon: Boolean(body.is_coming_soon),
        is_bestseller: Boolean(body.is_bestseller),
        free_services_json: includes.length ? includes as Prisma.InputJsonValue : null,
        images_json: images.length ? images as Prisma.InputJsonValue : null,
        ...(addons.length ? { addons: { create: addons } } : {}),
      },
      include: { addons: true },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create service", error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!canManage(session?.user?.role)) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.id) return NextResponse.json({ message: "Service ID is required" }, { status: 400 });
    const addons = body.addons !== undefined ? cleanAddons(body.addons) : undefined;
    const includes = body.free_services_json !== undefined ? cleanList(body.free_services_json) : undefined;
    const images = body.images_json !== undefined ? cleanList(body.images_json) : undefined;

    const service = await prisma.service.update({
      where: { id: body.id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
        ...(body.category !== undefined ? { category: String(body.category).trim() } : {}),
        ...(body.description_short !== undefined ? { description_short: body.description_short || null } : {}),
        ...(body.description_long !== undefined ? { description_long: body.description_long || null } : {}),
        ...(body.price !== undefined ? { price: Number(body.price || 0) } : {}),
        ...(body.discounted_price !== undefined ? { discounted_price: body.discounted_price === "" || body.discounted_price == null ? null : Number(body.discounted_price) } : {}),
        ...(body.slot_duration_mins !== undefined ? { slot_duration_mins: Number(body.slot_duration_mins || 60) } : {}),
        ...(body.max_slots_per_day !== undefined ? { max_slots_per_day: body.max_slots_per_day === "" || body.max_slots_per_day == null ? null : Number(body.max_slots_per_day) } : {}),
        ...(body.is_active !== undefined ? { is_active: Boolean(body.is_active) } : {}),
        ...(body.is_coming_soon !== undefined ? { is_coming_soon: Boolean(body.is_coming_soon) } : {}),
        ...(body.is_bestseller !== undefined ? { is_bestseller: Boolean(body.is_bestseller) } : {}),
        ...(includes !== undefined ? { free_services_json: includes.length ? includes as Prisma.InputJsonValue : null } : {}),
        ...(images !== undefined ? { images_json: images.length ? images as Prisma.InputJsonValue : null } : {}),
        ...(addons !== undefined ? { addons: { deleteMany: {}, create: addons } } : {}),
      },
      include: { addons: true },
    });
    return NextResponse.json(service);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update service", error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!canManage(session?.user?.role)) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Service ID is required" }, { status: 400 });
    const bookingCount = await prisma.booking.count({ where: { service_id: id } });
    if (bookingCount > 0) {
      await prisma.service.update({ where: { id }, data: { is_active: false } });
      return NextResponse.json({ message: "Service has bookings, so it was disabled instead of deleted" });
    }
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ message: "Service deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete service", error: String(error) }, { status: 500 });
  }
}
