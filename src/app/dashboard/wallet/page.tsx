"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CreditCard, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

function money(value: unknown) {
  const num = Number(value) || 0;
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function DashboardWalletPage() {
  const { data: session } = useSession();
  const [balances, setBalances] = useState<{ wallet_balance: number; outstanding_balance: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setBalances({
            wallet_balance: Number(data.wallet_balance) || 0,
            outstanding_balance: Number(data.outstanding_balance) || 0,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet & Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your account balance, and where to review payments and invoices.</p>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center rounded-lg border bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <p className="text-xs font-medium">Wallet Balance</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-600">{money(balances?.wallet_balance)}</p>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <p className="text-xs font-medium">Outstanding Balance</p>
            </div>
            <p className={`mt-2 text-2xl font-bold ${(balances?.outstanding_balance || 0) > 0 ? "text-red-600" : "text-foreground"}`}>
              {money(balances?.outstanding_balance)}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-white p-8 text-center">
        <CreditCard className="mx-auto mb-3 h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">Open your bookings to review payment status, receipts, and service history.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">View bookings</Link>
        </Button>
      </div>
    </div>
  );
}
