import { Bell } from "lucide-react";

export default function DashboardNotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Booking confirmations, reminders, cancellations, and expiry updates are sent to your registered email.</p>
      </div>
      <div className="rounded-lg border bg-white p-8 text-center">
        <Bell className="mx-auto mb-3 h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">You are all caught up.</p>
      </div>
    </div>
  );
}
