import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultCoupons, petCareServices } from "../src/lib/pet-care-pricing";
const prisma = new PrismaClient();

async function main() {
  await prisma.addon.deleteMany({});
  await prisma.service.deleteMany({});

  for (const service of petCareServices) {
    const { addons, ...data } = service;
    await prisma.service.create({
      data: {
        ...data,
        is_active: true,
        is_coming_soon: false,
        is_bestseller: Boolean(data.is_bestseller),
        free_services_json: data.free_services_json as Prisma.InputJsonValue | undefined,
        images_json: data.images_json as Prisma.InputJsonValue | undefined,
        ...(addons?.length ? { addons: { create: addons } } : {}),
      },
    });
  }
  console.log("Seeded", petCareServices.length, "services");

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
