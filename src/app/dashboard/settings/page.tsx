"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, User } from "lucide-react";

export default function DashboardSettingsPage() {
  const { data: session, status } = useSession();
  const [isActive, setIsActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsActive(data ? Boolean(data.is_active) : null));
  }, [session?.user?.id]);

  if (status === "loading") {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const user = session?.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your account information.</p>
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold">{user?.name || "Not set"}</p>
            <p className="text-sm text-muted-foreground">{user?.email || "No email"}</p>
          </div>
        </div>

        <div className="grid gap-3 pt-4 border-t sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">Role</p>
            <p className="text-sm font-bold">{user?.role || "CLIENT"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">Account Status</p>
            <p className={`text-sm font-bold ${isActive === false ? "text-red-600" : "text-green-600"}`}>
              {isActive === null ? "Loading..." : isActive ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/settings"><Settings className="mr-2 h-4 w-4" /> Manage Address</Link>
        </Button>
      </div>
    </div>
  );
}
