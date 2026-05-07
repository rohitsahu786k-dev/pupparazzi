import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  // Clear existing services
  await prisma.service.deleteMany({});

  const services = [
    { name: "Premium Grooming", category: "Grooming", description_short: "Full bath, haircut, nail trim & styling", price: 1499, discounted_price: 999, slot_duration_mins: 90, is_bestseller: true, is_active: true, is_coming_soon: false },
    { name: "Basic Bath & Brush", category: "Grooming", description_short: "Bath, blow dry & brushing", price: 799, discounted_price: 599, slot_duration_mins: 60, is_active: true, is_coming_soon: false, is_bestseller: false },
    { name: "Boarding (Per Day)", category: "Boarding", description_short: "Safe & comfortable stay", price: 999, discounted_price: 799, slot_duration_mins: 1440, is_active: true, is_coming_soon: false, is_bestseller: false },
    { name: "Dog Walking", category: "Walking", description_short: "30-min guided walk", price: 349, discounted_price: 299, slot_duration_mins: 30, is_active: true, is_coming_soon: false, is_bestseller: false },
    { name: "Swimming Session", category: "Swimming", description_short: "Pool fun & exercise", price: 699, discounted_price: 499, slot_duration_mins: 45, is_active: true, is_coming_soon: false, is_bestseller: false },
    { name: "Vet Consultation", category: "Veterinary", description_short: "At-home vet visit", price: 1999, discounted_price: 1499, slot_duration_mins: 60, is_active: true, is_coming_soon: false, is_bestseller: false },
    { name: "Basic Training", category: "Training", description_short: "Obedience & commands", price: 2499, discounted_price: 1999, slot_duration_mins: 60, is_active: true, is_coming_soon: false, is_bestseller: false },
    { name: "Flea & Tick Treatment", category: "Grooming", description_short: "Anti-parasite bath", price: 1299, discounted_price: 999, slot_duration_mins: 75, is_active: true, is_coming_soon: false, is_bestseller: false },
  ];

  for (const s of services) {
    await prisma.service.create({ data: s });
  }
  console.log("Seeded", services.length, "services");

  // Create/update admin user
  const adminEmail = "customer.unfoldcro@gmail.com";
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
}

main().catch(console.error).finally(() => prisma.$disconnect());
