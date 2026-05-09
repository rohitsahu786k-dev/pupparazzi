import Link from "next/link";
import { HelpCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardHelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help & FAQs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Need help with a booking, payment, coupon, or pet profile?</p>
      </div>
      <div className="rounded-lg border bg-white p-8 text-center">
        <HelpCircle className="mx-auto mb-3 h-10 w-10 text-primary" />
        <p className="text-sm text-muted-foreground">Email Pupparazzi support and the team will help you quickly.</p>
        <Button asChild className="mt-4">
          <Link href="mailto:pupparazzipetstore@gmail.com">
            <Mail className="mr-2 h-4 w-4" />
            Email support
          </Link>
        </Button>
      </div>
    </div>
  );
}
