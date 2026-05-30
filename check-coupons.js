const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Seed default coupons if not present
  const existing = await p.appSetting.findUnique({ where: { key: 'coupons' } });
  if (!existing) {
    const defaultCoupons = [
      {
        code: "FIRST10",
        description: "10% OFF",
        discount_type: "PERCENTAGE",
        discount_value: 10,
        minimum_order_amount: 500,
        usage_limit: 100,
        expires_at: "2026-12-31",
        is_active: true,
        terms: "Valid on active services above Rs. 500.",
      },
      {
        code: "GROOM20",
        description: "Grooming Discount",
        discount_type: "PERCENTAGE",
        discount_value: 20,
        category: "Grooming",
        minimum_order_amount: 850,
        usage_limit: 50,
        expires_at: "2026-12-31",
        is_active: true,
        terms: "Valid only on grooming services and packages.",
      },
      {
        code: "BOARD5",
        description: "Boarding Discount",
        discount_type: "PERCENTAGE",
        discount_value: 5,
        category: "Boarding",
        minimum_order_amount: 600,
        usage_limit: 50,
        expires_at: "2026-12-31",
        is_active: true,
        terms: "Valid only on boarding services and packages.",
      },
    ];
    await p.appSetting.create({ data: { key: 'coupons', value: defaultCoupons } });
    console.log('Coupons seeded successfully:', defaultCoupons.length, 'coupons');
  } else {
    const coupons = Array.isArray(existing.value) ? existing.value : [];
    console.log('Coupons already exist:', coupons.length, 'coupons');
  }
  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); });
