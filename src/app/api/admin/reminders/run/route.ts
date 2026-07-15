import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { runReminderProcessor } from "@/lib/reminders/processor";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/admin/reminders/run — manually trigger the reminder processor
export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  try {
    const result = await runReminderProcessor({ trigger: "admin-manual" });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/reminders/run] failed:", error);
    return NextResponse.json({ success: false, message: "Reminder processing failed" }, { status: 500 });
  }
}
