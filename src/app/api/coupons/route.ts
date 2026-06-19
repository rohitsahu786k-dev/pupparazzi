import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { calculateCouponDiscount, CouponRule, defaultCoupons } from "@/lib/pet-care-pricing";

async function getCoupons() {
  const setting = await prisma.appSetting.findUnique({ where: { key: "coupons" } });
  return (Array.isArray(setting?.value) ? setting.value : defaultCoupons) as CouponRule[];
}

async function saveCoupons(coupons: CouponRule[]) {
  return prisma.appSetting.upsert({
    where: { key: "coupons" },
    update: { value: coupons },
    create: { key: "coupons", value: coupons },
  });
}

function cleanCoupon(body: any, existing?: CouponRule): CouponRule {
  const code = String(body.code ?? existing?.code ?? "").trim().toUpperCase();
  return {
    code,
    description: String(body.description ?? existing?.description ?? ""),
    discount_type: body.discount_type === "FLAT" ? "FLAT" : "PERCENTAGE",
    discount_value: Number(body.discount_value ?? existing?.discount_value ?? 0),
    category: body.category === "All" || body.category === "" ? undefined : body.category ?? existing?.category,
    minimum_order_amount: Number(body.minimum_order_amount ?? existing?.minimum_order_amount ?? 0),
    usage_limit: Number(body.usage_limit ?? existing?.usage_limit ?? 0),
    expires_at: String(body.expires_at ?? existing?.expires_at ?? ""),
    is_active: body.is_active ?? existing?.is_active ?? true,
    terms: String(body.terms ?? existing?.terms ?? ""),
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const admin = searchParams.get("admin") === "true";
    if (admin) {
      const session = await requireAdmin();
      if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const code = searchParams.get("code")?.trim().toUpperCase();
    const subtotal = Number(searchParams.get("subtotal") || 0);
    const category = searchParams.get("category") || "";

    const coupons = await getCoupons();
    if (!code) {
      return NextResponse.json(admin ? coupons : coupons.filter((coupon) => coupon.is_active));
    }

    const coupon = coupons.find((item) => item.code.toUpperCase() === code);
    if (!coupon || !coupon.is_active) {
      return NextResponse.json({ valid: false, message: "Coupon code is not active." }, { status: 404 });
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, message: "Coupon code has expired." }, { status: 400 });
    }
    if (coupon.category && coupon.category !== category) {
      return NextResponse.json({ valid: false, message: `Coupon is valid only for ${coupon.category}.` }, { status: 400 });
    }
    if (subtotal < coupon.minimum_order_amount) {
      return NextResponse.json({ valid: false, message: `Minimum order amount is ₹${coupon.minimum_order_amount}.` }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      coupon,
      discount: calculateCouponDiscount(coupon, subtotal),
      message: `${coupon.code} applied successfully.`,
    });
  } catch (error) {
    return NextResponse.json({ message: "Failed to validate coupon", error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const coupons = await getCoupons();
  const coupon = cleanCoupon(body);
  if (!coupon.code) return NextResponse.json({ message: "Coupon code is required" }, { status: 400 });
  if (coupons.some((item) => item.code.toUpperCase() === coupon.code)) {
    return NextResponse.json({ message: "Coupon already exists" }, { status: 409 });
  }
  const next = [...coupons, coupon];
  await saveCoupons(next);
  return NextResponse.json(coupon, { status: 201 });
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json();
  const code = String(body.code || "").trim().toUpperCase();
  const coupons = await getCoupons();
  const existing = coupons.find((item) => item.code.toUpperCase() === code);
  if (!existing) return NextResponse.json({ message: "Coupon not found" }, { status: 404 });
  const next = coupons.map((item) => item.code.toUpperCase() === code ? cleanCoupon(body, existing) : item);
  await saveCoupons(next);
  return NextResponse.json(next.find((item) => item.code.toUpperCase() === code));
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim().toUpperCase();
  if (!code) return NextResponse.json({ message: "Coupon code is required" }, { status: 400 });
  const coupons = await getCoupons();
  await saveCoupons(coupons.filter((item) => item.code.toUpperCase() !== code));
  return NextResponse.json({ message: "Coupon deleted" });
}
