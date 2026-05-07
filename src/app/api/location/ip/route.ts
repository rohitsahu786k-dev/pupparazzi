import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return forwarded || realIp || "";
}

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const url = ip && !["::1", "127.0.0.1"].includes(ip)
      ? `https://ipapi.co/${encodeURIComponent(ip)}/json/`
      : "https://ipapi.co/json/";
    const res = await fetch(url, { next: { revalidate: 60 * 30 } });
    if (!res.ok) {
      return NextResponse.json({ city: "Ahmedabad", state: "Gujarat", pincode: "" });
    }
    const data = await res.json();
    return NextResponse.json({
      city: data.city || "Ahmedabad",
      state: data.region || "Gujarat",
      pincode: String(data.postal || "").match(/\d{6}/)?.[0] || "",
      displayName: [data.city, data.region].filter(Boolean).join(", ") || "Ahmedabad, Gujarat",
    });
  } catch {
    return NextResponse.json({ city: "Ahmedabad", state: "Gujarat", pincode: "", displayName: "Ahmedabad, Gujarat" });
  }
}
