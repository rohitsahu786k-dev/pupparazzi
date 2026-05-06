import { google } from "googleapis";
import { prisma } from "./prisma";

/**
 * Create a Google Calendar event for a booking.
 * Uses the user's stored OAuth tokens from the Account table.
 */
export async function createCalendarEvent({
  userId,
  serviceName,
  petName,
  slotDate,
  slotTime,
  durationMins = 60,
  address,
}: {
  userId: string;
  serviceName: string;
  petName: string;
  slotDate: string; // ISO date
  slotTime: string; // e.g. "10:00 AM"
  durationMins?: number;
  address?: string;
}): Promise<string | null> {
  try {
    // Get the user's Google account tokens
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
    });

    if (!account?.access_token) {
      console.log("No Google account linked for user:", userId);
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Parse slot time like "10:00 AM" into hours/minutes
    const [timePart, meridiem] = slotTime.split(" ");
    let [hours, minutes] = timePart.split(":").map(Number);
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    const startDate = new Date(slotDate);
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(startDate.getTime() + durationMins * 60000);

    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `🐾 ${serviceName} - ${petName}`,
        description: `PetCare Pro Booking\n\nService: ${serviceName}\nPet: ${petName}${address ? `\nAddress: ${address}` : ""}\n\nBooked via PetCare Pro`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: "Asia/Kolkata",
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 60 },
            { method: "popup", minutes: 15 },
          ],
        },
        colorId: "6", // Tangerine color to match brand
      },
    });

    console.log("Google Calendar event created:", event.data.id);
    return event.data.id || null;
  } catch (error: any) {
    console.error("Google Calendar error:", error?.message || error);
    return null;
  }
}
