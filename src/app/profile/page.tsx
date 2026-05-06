"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Shield, UserCircle2 } from "lucide-react";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const user = session?.user;

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">My Profile</h1>
          <p className="text-secondary mt-1">Your account details are shown below.</p>
        </div>

        <Card className="rounded-[10px] border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCircle2 className="h-5 w-5 text-primary" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[10px] border border-border p-4">
              <p className="text-xs text-secondary font-medium mb-1">Name</p>
              <p className="text-sm font-semibold text-foreground">{user?.name || "Not set"}</p>
            </div>
            <div className="rounded-[10px] border border-border p-4">
              <p className="text-xs text-secondary font-medium mb-1 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                Email
              </p>
              <p className="text-sm font-semibold text-foreground">{user?.email || "Not set"}</p>
            </div>
            <div className="rounded-[10px] border border-border p-4">
              <p className="text-xs text-secondary font-medium mb-1 flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" />
                Role
              </p>
              <p className="text-sm font-semibold text-foreground">{user?.role || "CLIENT"}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings">Open Settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
