"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Lock, UserCog } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 lg:px-8 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">Settings</h1>
          <p className="text-secondary mt-1">Manage your account preferences.</p>
        </div>

        <Card className="rounded-[10px] border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[10px] border border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-secondary" />
                <span className="text-sm font-medium text-foreground">Notifications</span>
              </div>
              <span className="text-xs font-semibold text-secondary">Coming soon</span>
            </div>
            <div className="rounded-[10px] border border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-secondary" />
                <span className="text-sm font-medium text-foreground">Security</span>
              </div>
              <span className="text-xs font-semibold text-secondary">Coming soon</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/profile">Go to Profile</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
