"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, Loader2 } from "lucide-react";

type Notification = {
  id: string;
  type: string;
  subject?: string | null;
  body: string;
  status: string;
  sent_at?: string | null;
  created_at: string;
};

export default function DashboardNotificationsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    // Notifications are stored in DB but there's no public API yet
    // Show a friendly message for now
    setLoading(false);
  }, [session?.user?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Booking confirmations, reminders, and updates are sent to your email.
        </p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-10 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-primary" />
          <p className="font-medium">You&apos;re all caught up!</p>
          <p className="mt-2 text-sm text-muted-foreground">
            All booking confirmations, reminders, and status updates are sent directly to your registered email address.
          </p>
        </div>
      )}
    </div>
  );
}
