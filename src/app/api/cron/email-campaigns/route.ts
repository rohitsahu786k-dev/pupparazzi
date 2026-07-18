import { NextResponse } from "next/server";
import { processMigratedActivationCampaign } from "@/lib/email-campaigns";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await processMigratedActivationCampaign());
  } catch (error) {
    console.error("[cron/email-campaigns] failed:", String(error));
    return NextResponse.json({ message: "Campaign processing failed" }, { status: 500 });
  }
}
