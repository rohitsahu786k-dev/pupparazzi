import { redirect } from "next/navigation";

export default function StaffBookingsRedirect() {
  redirect("/admin/bookings");
}
