"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Calendar, PawPrint, Loader2, CheckCircle2,
  Clock, AlertCircle, RotateCcw, XCircle,
  TrendingUp, ChevronRight, Star, History,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

type Booking = {
  id: string;
  booking_id: string;
  status: string;
  payment_status: string;
  slot_date: string;
  slot_time: string;
  addons_json?: {
    pricing?: { total?: number; subtotal?: number; couponDiscount?: number; addonTotal?: number };
    payment?: { plan?: string; advanceAmount?: number; remainingCodAmount?: number; mode?: string };
    coupon?: { code?: string; discount?: number } | null;
  } | null;
  service?: { name: string; price: number; discounted_price?: number | null };
  pet?: { name: string };
};

type Pet = {
  id: string;
  name: string;
  breed?: string;
  type: string;
};

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  Confirmed:  { label: "Confirmed",   cls: "bg-green-50 text-green-700 border border-green-100",    icon: <CheckCircle2 className="h-3 w-3" /> },
  Pending:    { label: "Pending",     cls: "bg-amber-50 text-amber-700 border border-amber-100",    icon: <Clock className="h-3 w-3" /> },
  Completed:  { label: "Completed",   cls: "bg-accent/10 text-accent border border-accent/20",      icon: <Star className="h-3 w-3 fill-current" /> },
  Cancelled:  { label: "Cancelled",   cls: "bg-red-50 text-red-600 border border-red-100",          icon: <XCircle className="h-3 w-3" /> },
  "In Progress": { label: "In Progress", cls: "bg-primary/10 text-primary border border-primary/20",   icon: <RotateCcw className="h-3 w-3 animate-spin" /> },
  Expired:    { label: "Expired",     cls: "bg-slate-100 text-slate-600 border border-slate-200",    icon: <AlertCircle className="h-3 w-3" /> },
};

const PAY_CFG: Record<string, { label: string; cls: string }> = {
  Paid:     { label: "Paid",     cls: "bg-green-50 text-green-700" },
  "Partially Paid": { label: "Partially paid", cls: "bg-blue-50 text-blue-700" },
  "Advance Paid": { label: "Advance paid", cls: "bg-blue-50 text-blue-700" },
  Pending:  { label: "Unpaid",   cls: "bg-amber-50 text-amber-700" },
  Refunded: { label: "Refunded", cls: "bg-accent/10 text-accent" },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: "bg-muted text-secondary border border-border", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-[10px] ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function bookingAmount(booking: Booking) {
  return Number(booking.addons_json?.pricing?.total ?? booking.service?.discounted_price ?? booking.service?.price ?? 0);
}

function paymentLine(booking: Booking) {
  const payment = booking.addons_json?.payment;
  if (payment?.plan === "COD_ADVANCE") {
    return `Rs.${Number(payment.advanceAmount || 100).toLocaleString("en-IN")} advance, Rs.${Number(payment.remainingCodAmount || 0).toLocaleString("en-IN")} COD`;
  }
  return "Full online payment";
}

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const justBooked = searchParams?.get("booked") === "true";
  const userId     = (session?.user as any)?.id;
  const userName   = session?.user?.name || "Pet Parent";

  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [pets,        setPets]        = useState<Pet[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [cancellingId,setCancellingId]= useState<string | null>(null);
  const [activeTab,   setActiveTab]   = useState<"upcoming" | "history">("upcoming");
  const [showSuccess, setShowSuccess] = useState(justBooked);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetch(`/api/bookings?userId=${userId}`).then(r => r.json()),
      fetch(`/api/users/${userId}/pets`).then(r => r.json()),
    ]).then(([b, p]) => {
      setBookings(Array.isArray(b) ? b : []);
      setPets(Array.isArray(p) ? p : []);
    }).finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 5000);
    return () => clearTimeout(t);
  }, [showSuccess]);

  async function cancelBooking(internalId: string) {
    if (!confirm("Cancel this booking? A confirmation email will be sent to you.")) return;
    setCancellingId(internalId);
    try {
      const res = await fetch("/api/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: internalId, status: "Cancelled" }),
      });
      if (res.ok) setBookings(prev => prev.map(b => b.id === internalId ? { ...b, status: "Cancelled" } : b));
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const upcoming   = bookings.filter(b => !["Completed", "Cancelled", "Expired"].includes(b.status));
  const history    = bookings.filter(b => ["Completed", "Cancelled", "Expired"].includes(b.status));
  const totalSpent = bookings
    .filter(b => b.payment_status === "Paid")
    .reduce((sum, b) => sum + bookingAmount(b), 0);

  return (
    <div className="space-y-8">

      {/* Success toast */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-[10px] p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-green-800">Booking placed successfully!</p>
            <p className="text-sm text-green-600">A confirmation email has been sent to your inbox.</p>
          </div>
          <button onClick={() => setShowSuccess(false)} className="ml-auto text-green-400 hover:text-green-600">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Hello, {userName}</h1>
          <p className="text-secondary mt-1">Welcome to your Pupparazzi dashboard.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/book">+ Book a Service</Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
        {[
          { icon: <Calendar className="h-5 w-5 text-primary" />,   bg: "bg-primary/10", label: "Total Bookings", value: bookings.length },
          { icon: <Clock className="h-5 w-5 text-amber-500" />,    bg: "bg-amber-50",   label: "Upcoming",       value: upcoming.length },
          { icon: <PawPrint className="h-5 w-5 text-accent" />,    bg: "bg-accent/10",  label: "My Pets",        value: pets.length },
          { icon: <TrendingUp className="h-5 w-5 text-green-500" />,bg:"bg-green-50",  label: "Total Spent",    value: `Rs.${totalSpent.toLocaleString("en-IN")}` },
        ].map((s, i) => (
          <Card key={i} className="border-none shadow-sm rounded-[10px]">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-[10px] ${s.bg} flex items-center justify-center flex-shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className="text-xs text-secondary font-medium">{s.label}</p>
                <p className="text-xl font-extrabold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bookings */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-sm rounded-[10px]">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Calendar className="h-4 w-4 text-primary" /> Bookings
                </CardTitle>
                <div className="flex gap-1 bg-muted rounded-[10px] p-1">
                  {(["upcoming", "history"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-[10px] transition-all capitalize ${
                        activeTab === tab ? "bg-white shadow text-foreground" : "text-secondary hover:text-foreground"
                      }`}
                    >
                      {tab === "history"
                        ? <span className="flex items-center gap-1"><History className="h-3 w-3" /> History</span>
                        : "Upcoming"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {(activeTab === "upcoming" ? upcoming : history).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-[10px]">
                  <PawPrint className="h-10 w-10 text-border mb-3" />
                  <p className="text-secondary text-sm font-medium">
                    {activeTab === "upcoming" ? "No upcoming bookings" : "No past bookings"}
                  </p>
                  {activeTab === "upcoming" && (
                    <Button variant="link" asChild className="mt-1 text-sm font-bold">
                      <Link href="/book">Schedule a session</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {(activeTab === "upcoming" ? upcoming : history).map(b => {
                    const payCfg   = PAY_CFG[b.payment_status] ?? { label: b.payment_status, cls: "bg-muted text-secondary" };
                    const canCancel = !["Cancelled", "Completed", "Expired"].includes(b.status);
                    return (
                      <div key={b.id} className="group border border-border rounded-[10px] p-4 hover:border-primary/30 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-bold text-sm text-foreground truncate">{b.service?.name || "Service"}</h3>
                              <StatusBadge status={b.status} />
                            </div>
                            <p className="text-xs text-secondary">
                              {b.pet?.name} &nbsp;·&nbsp; {b.slot_time} &nbsp;·&nbsp; {fmt(b.slot_date)}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs font-bold text-foreground">Rs.{bookingAmount(b).toLocaleString("en-IN")}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[10px] ${payCfg.cls}`}>{payCfg.label}</span>
                              <span className="text-xs text-secondary">{b.booking_id}</span>
                            </div>
                            <p className="mt-1 text-xs text-secondary">{paymentLine(b)}</p>
                            {b.addons_json?.coupon?.code && <p className="mt-1 text-xs font-semibold text-green-700">{b.addons_json.coupon.code} coupon applied</p>}
                          </div>
                          {canCancel && (
                            <button
                              onClick={() => cancelBooking(b.id)}
                              disabled={cancellingId === b.id}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-400 hover:text-red-600 font-semibold flex items-center gap-1 flex-shrink-0"
                            >
                              {cancellingId === b.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <XCircle className="h-3 w-3" />}
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Book CTA */}
          <Card className="border-none shadow-sm bg-gradient-to-br from-primary to-accent text-white rounded-[10px]">
            <CardContent className="p-5 space-y-4">
              <div className="w-10 h-10 bg-white/20 rounded-[10px] flex items-center justify-center">
                <PawPrint className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-base mb-1">Ready to book?</p>
                <p className="text-white/75 text-xs leading-relaxed">Premium grooming and boarding care.</p>
              </div>
              <Button asChild className="w-full bg-white text-primary hover:bg-white/90 font-bold text-sm">
                <Link href="/book" className="flex items-center justify-center gap-1">
                  Book a Service <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* My Pets */}
          <Card className="border-none shadow-sm rounded-[10px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between text-foreground">
                <span className="flex items-center gap-2"><PawPrint className="h-4 w-4 text-primary" /> My Pets ({pets.length})</span>
                {pets.length > 0 && (
                  <Link href="/book" className="text-xs text-primary font-bold hover:opacity-80">+ Add</Link>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pets.length === 0 ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-[10px] bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <PawPrint className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-xs text-secondary mb-3">No pets added yet.</p>
                  <Button variant="outline" size="sm" className="w-full text-xs font-bold" asChild>
                    <Link href="/book">Add Your First Pet</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {pets.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-[10px] bg-muted hover:bg-primary/5 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                        <PawPrint className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-secondary truncate">{p.breed || p.type}</p>
                      </div>
                      <Link href={`/book?pet=${p.id}`} className="ml-auto flex-shrink-0">
                        <ChevronRight className="h-4 w-4 text-border hover:text-primary" />
                      </Link>
                    </div>
                  ))}
                  {pets.length > 4 && (
                    <p className="text-xs text-secondary text-center pt-1">+{pets.length - 4} more pets</p>
                  )}
                  <Button variant="outline" size="sm" className="w-full text-xs font-bold mt-2" asChild>
                    <Link href="/book">Book for a Pet</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help */}
          <Card className="border-none shadow-sm bg-muted rounded-[10px]">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground mb-1">Need Help?</p>
                <p className="text-xs text-secondary leading-relaxed">
                  Email us at{" "}
                  <a href="mailto:pupparazzipetstore@gmail.com" className="text-primary font-medium hover:underline">
                    pupparazzipetstore@gmail.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
