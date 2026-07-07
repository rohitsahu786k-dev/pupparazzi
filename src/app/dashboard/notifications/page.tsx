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

function formatTimestamp(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardNotificationsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
      ) : items.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-primary" />
          <p className="font-medium">You&apos;re all caught up!</p>
          <p className="mt-2 text-sm text-muted-foreground">
            All booking confirmations, reminders, and status updates are sent directly to your registered email address.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">{item.subject || item.type}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTimestamp(item.sent_at || item.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
