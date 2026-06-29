import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultCoupons, petCareServices } from "../src/lib/pet-care-pricing";
const prisma = new PrismaClient();

const legacyDemoServices = [
  "Basic Bath & Brush",
  "Premium Grooming",
  "Flea & Tick Treatment",
  "Boarding (Per Day)",
];

async function main() {
  // Keep historical booking relations intact while removing old demo entries from public booking.
  await prisma.service.updateMany({
    where: { name: { in: legacyDemoServices } },
    data: { is_active: false },
  });

  for (const service of petCareServices) {
    const { addons, ...data } = service;
    const existing = await prisma.service.findFirst({
      where: { name: data.name, category: data.category },
      select: { id: true },
    });
    const serviceData = {
        ...data,
        is_active: true,
        is_coming_soon: false,
        is_bestseller: Boolean(data.is_bestseller),
        free_services_json: data.free_services_json as Prisma.InputJsonValue | undefined,
        images_json: data.images_json as Prisma.InputJsonValue | undefined,
    };
    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: {
          ...serviceData,
          addons: { deleteMany: {}, ...(addons?.length ? { create: addons } : {}) },
        },
      });
    } else {
      await prisma.service.create({
        data: { ...serviceData, ...(addons?.length ? { addons: { create: addons } } : {}) },
      });
    }
  }
  console.log("Synced", petCareServices.length, "services without deleting bookings or admin data");

  // Create/update admin user
  const adminEmail = "admin@pupparazzi.local";
  const adminPassword = "Admin@Pupparazzi2024";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", password_hash: passwordHash, emailVerified: new Date() },
    create: {
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      password_hash: passwordHash,
      emailVerified: new Date(),
    },
  });
  console.log(`Admin user ready — email: ${adminEmail} | password: ${adminPassword}`);

  // Enable "Allow All Pincodes" globally
  await prisma.serviceArea.upsert({
    where: { pincode: "GLOBAL" },
    update: { is_active: true },
    create: {
      pincode: "GLOBAL",
      city: "All India",
      area_name: "Allow All Pincodes",
      state: "India",
      country: "India",
      is_active: true,
    },
  });
  console.log("All pincodes enabled (GLOBAL mode on)");

  await prisma.appSetting.upsert({
    where: { key: "coupons" },
    update: { value: defaultCoupons },
    create: { key: "coupons", value: defaultCoupons },
  });
  console.log("Default coupons enabled");
}

main().catch(console.error).finally(() => prisma.$disconnect());
