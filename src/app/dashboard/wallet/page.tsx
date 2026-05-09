import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardWalletPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet & Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paid bookings and invoices are available from your booking history.</p>
      </div>
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
