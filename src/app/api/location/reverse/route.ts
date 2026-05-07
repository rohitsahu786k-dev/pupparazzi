import { NextResponse } from "next/server";

export const runtime = "nodejs";

function pickAddress(address: any) {
  const pincode = String(address?.postcode || "").match(/\d{6}/)?.[0] || "";
  return {
    line1: [
      address?.house_number,
      address?.road,
      address?.neighbourhood,
      address?.suburb,
      address?.quarter,
    ].filter(Boolean).join(", "),
    city: address?.city || address?.town || address?.village || address?.county || "",
    state: address?.state || "",
    pincode,
    displayName: "",
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon || Number.isNaN(Number(lat)) || Number.isNaN(Number(lon))) {
    return NextResponse.json({ message: "Valid lat and lon are required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=jsonv2&addressdetails=1`,
      {
        headers: {
          "Accept-Language": "en-IN,en",
          "User-Agent": "Pupparazzi/1.0 (pupparazzipetstore@gmail.com)",
        },
        next: { revalidate: 60 * 60 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ message: "Unable to detect address" }, { status: 502 });
    }

    const data = await res.json();
    const address = pickAddress(data.address || {});
    return NextResponse.json({
      ...address,
      displayName: data.display_name || [address.city, address.state].filter(Boolean).join(", "),
    });
  } catch (error) {
    return NextResponse.json({ message: "Location service failed", error: String(error) }, { status: 500 });
  }
}
