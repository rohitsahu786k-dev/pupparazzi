"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Download, Eye, Loader2, Printer, Share2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Asset = {
  id: string;
  original_name: string;
  path: string;
  document_type?: string | null;
};

type Booking = {
  id: string;
  booking_id: string;
  status: string;
  slot_date: string;
  slot_time: string;
  end_time?: string | null;
  staff_name?: string | null;
  notes?: string | null;
  boarding_type?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  check_in_slot?: string | null;
  check_out_slot?: string | null;
  weight?: number | null;
  check_out_weight?: number | null;
  meal_type?: string | null;
  kennel?: string | null;
  final_amount?: number | null;
  late_checkout_fees?: number | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  companion_name?: string | null;
  companion_phone?: string | null;
  services_json?: string[] | null;
  documents_json?: Record<string, { assetId: string; path: string; name: string }> | null;
  details_completed: boolean;
  client?: { id: string; name?: string | null; email?: string | null; phone?: string | null };
  pet?: { id: string; name?: string | null; type?: string | null; breed?: string | null };
  service?: { id: string; name?: string | null; category?: string | null };
  documents?: Asset[];
};

const REQUIRED_DOCS = [
  { key: "aadhaar_front", label: "Aadhaar Card Front", category: "KYC", folder: "kyc" },
  { key: "aadhaar_back", label: "Aadhaar Card Back", category: "KYC", folder: "kyc" },
  { key: "pan_card", label: "PAN Card", category: "KYC", folder: "kyc" },
  { key: "vaccination_certificate", label: "Vaccination Certificate", category: "Vaccination", folder: "vaccination" },
];

function dateInput(value?: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function emptyDocuments() {
  return REQUIRED_DOCS.reduce<Record<string, { assetId: string; path: string; name: string }>>((acc, doc) => {
    acc[doc.key] = { assetId: "", path: "", name: "" };
    return acc;
  }, {});
}

export default function BookingDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState("");
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<{ label: string; path: string } | null>(null);
  const [form, setForm] = useState({
    boarding_type: "",
    check_in_date: "",
    check_out_date: "",
    check_in_time: "",
    check_out_time: "",
    check_in_slot: "",
    check_out_slot: "",
    weight: "",
    check_out_weight: "",
    meal_type: "",
    kennel: "",
    final_amount: "",
    late_checkout_fees: "",
    refund_amount: "",
    refund_reason: "",
    companion_name: "",
    companion_phone: "",
    end_time: "",
    staff_name: "",
    services_text: "",
    notes: "",
    documents_json: emptyDocuments(),
  });

  const category = booking?.service?.category || "";
  const isBoarding = category === "Boarding";
  const isGrooming = category === "Grooming";

  async function fetchBooking() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/bookings?bookingId=${params.id}`);
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      setError(data?.message || "Booking could not be loaded.");
      setLoading(false);
      return;
    }
    setBooking(data);
    const docs = { ...emptyDocuments(), ...(data.documents_json || {}) };
    setForm({
      boarding_type: data.boarding_type || data.service?.name || "",
      check_in_date: dateInput(data.check_in_date || data.slot_date),
      check_out_date: dateInput(data.check_out_date),
      check_in_time: data.check_in_time || data.slot_time || "",
      check_out_time: data.check_out_time || "",
      check_in_slot: data.check_in_slot || "",
      check_out_slot: data.check_out_slot || "",
      weight: data.weight?.toString() || "",
      check_out_weight: data.check_out_weight?.toString() || "",
      meal_type: data.meal_type || "",
      kennel: data.kennel || "",
      final_amount: data.final_amount?.toString() || "",
      late_checkout_fees: data.late_checkout_fees?.toString() || "",
      refund_amount: data.refund_amount?.toString() || "",
      refund_reason: data.refund_reason || "",
      companion_name: data.companion_name || "",
      companion_phone: data.companion_phone || "",
      end_time: data.end_time || "",
      staff_name: data.staff_name || "",
      services_text: Array.isArray(data.services_json) ? data.services_json.join(", ") : data.service?.name || "",
      notes: data.notes || "",
      documents_json: docs,
    });
    setLoading(false);
  }

  useEffect(() => {
    fetchBooking();
  }, [params.id]);

  const missingDocuments = useMemo(() => REQUIRED_DOCS.filter((doc) => !form.documents_json[doc.key]?.assetId), [form.documents_json]);

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadDocument(doc: (typeof REQUIRED_DOCS)[number], file?: File) {
    if (!file || !booking) return;
    setUploadingKey(doc.key);
    setError("");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", doc.folder);
    formData.set("category", doc.category);
    formData.set("documentType", doc.label);
    formData.set("clientId", booking.client?.id || "");
    formData.set("petId", booking.pet?.id || "");
    formData.set("bookingId", booking.id);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Document upload failed.");
      setUploadingKey("");
      return;
    }
    setForm((prev) => ({
      ...prev,
      documents_json: {
        ...prev.documents_json,
        [doc.key]: { assetId: data.id, path: data.path || data.url, name: data.original_name || file.name },
      },
    }));
    setUploadingKey("");
  }

  async function shareDocument(path: string) {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
  }

  function printDocument(path: string) {
    const win = window.open(path, "_blank");
    win?.addEventListener("load", () => win.print());
  }

  async function saveDetails() {
    if (!booking) return;
    setSaving(true);
    setError("");
    if (missingDocuments.length) {
      setError("Please upload all required KYC and vaccination documents.");
      setSaving(false);
      return;
    }
    const services = form.services_text.split(",").map((item) => item.trim()).filter(Boolean);
    const body = {
      id: booking.id,
      notes: form.notes,
      boarding_type: form.boarding_type,
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      check_in_time: form.check_in_time,
      check_out_time: form.check_out_time,
      check_in_slot: form.check_in_slot,
      check_out_slot: form.check_out_slot,
      weight: form.weight,
      check_out_weight: form.check_out_weight,
      meal_type: form.meal_type,
      kennel: form.kennel,
      final_amount: form.final_amount,
      late_checkout_fees: form.late_checkout_fees,
      refund_amount: form.refund_amount,
      refund_reason: form.refund_reason,
      companion_name: form.companion_name,
      companion_phone: form.companion_phone,
      slot_date: isGrooming ? dateInput(booking.slot_date) : form.check_in_date,
      slot_time: isGrooming ? booking.slot_time : form.check_in_time,
      end_time: form.end_time,
      staff_name: form.staff_name,
      services_json: services,
      documents_json: form.documents_json,
      details_completed: true,
    };
    const res = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.message || "Booking details could not be saved.");
      setSaving(false);
      return;
    }
    router.push("/dashboard/bookings?details=saved");
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!booking) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error || "Booking not found."}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase text-primary">{booking.booking_id}</p>
          <h1 className="text-3xl font-bold tracking-tight">Complete Booking Details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.service?.name || "Service"} for {booking.pet?.name || "pet"}.
          </p>
        </div>
        <Button variant="outline" asChild><Link href="/dashboard/bookings"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-5">
          <div className="rounded-lg border bg-white p-5">
            <h2 className="font-bold">Booking Identity</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input readOnly value={booking.booking_id} />
              <Input readOnly value={booking.status} />
              <Input readOnly value={booking.pet?.name || ""} />
              <Input readOnly value={[booking.pet?.type, booking.pet?.breed].filter(Boolean).join(" - ")} />
            </div>
          </div>

          {isBoarding && (
            <div className="rounded-lg border bg-white p-5">
              <h2 className="font-bold">Boarding Details</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Input placeholder="Boarding type *" value={form.boarding_type} onChange={(e) => setField("boarding_type", e.target.value)} />
                <Input placeholder="Service name" readOnly value={booking.service?.name || ""} />
                <Input type="date" value={form.check_in_date} onChange={(e) => setField("check_in_date", e.target.value)} />
                <Input type="date" value={form.check_out_date} onChange={(e) => setField("check_out_date", e.target.value)} />
                <Input type="time" value={form.check_in_time} onChange={(e) => setField("check_in_time", e.target.value)} />
                <Input type="time" value={form.check_out_time} onChange={(e) => setField("check_out_time", e.target.value)} />
                <Input placeholder="Check-in slot (optional)" value={form.check_in_slot} onChange={(e) => setField("check_in_slot", e.target.value)} />
                <Input placeholder="Check-out slot (optional)" value={form.check_out_slot} onChange={(e) => setField("check_out_slot", e.target.value)} />
                <Input placeholder="Weight (optional)" type="number" value={form.weight} onChange={(e) => setField("weight", e.target.value)} />
                <Input placeholder="Check-out weight (optional)" type="number" value={form.check_out_weight} onChange={(e) => setField("check_out_weight", e.target.value)} />
                <Input placeholder="Meal type (optional)" value={form.meal_type} onChange={(e) => setField("meal_type", e.target.value)} />
                <Input placeholder="Kennel (optional)" value={form.kennel} onChange={(e) => setField("kennel", e.target.value)} />
                <Input placeholder="Final amount (optional)" type="number" value={form.final_amount} onChange={(e) => setField("final_amount", e.target.value)} />
                <Input placeholder="Late checkout fees (optional)" type="number" value={form.late_checkout_fees} onChange={(e) => setField("late_checkout_fees", e.target.value)} />
                <Input placeholder="Refund amount (optional)" type="number" value={form.refund_amount} onChange={(e) => setField("refund_amount", e.target.value)} />
                <Input placeholder="Refund reason (optional)" value={form.refund_reason} onChange={(e) => setField("refund_reason", e.target.value)} />
                <Input placeholder="Companion name (optional)" value={form.companion_name} onChange={(e) => setField("companion_name", e.target.value)} />
                <Input placeholder="Companion phone (optional)" value={form.companion_phone} onChange={(e) => setField("companion_phone", e.target.value)} />
              </div>
            </div>
          )}

          {isGrooming && (
            <div className="rounded-lg border bg-white p-5">
              <h2 className="font-bold">Grooming Details</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Input readOnly value={dateInput(booking.slot_date)} />
                <Input readOnly value={booking.slot_time} />
                <Input type="time" value={form.end_time} onChange={(e) => setField("end_time", e.target.value)} />
                <Input placeholder="Staff *" value={form.staff_name} onChange={(e) => setField("staff_name", e.target.value)} />
                <Input className="sm:col-span-2" placeholder="Services *" value={form.services_text} onChange={(e) => setField("services_text", e.target.value)} />
              </div>
            </div>
          )}

          <div className="rounded-lg border bg-white p-5">
            <h2 className="font-bold">Notes</h2>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="mt-4 min-h-28 w-full rounded-lg border bg-white p-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              placeholder="Notes (optional)"
            />
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border bg-white p-5">
            <h2 className="font-bold">KYC and Documents</h2>
            <div className="mt-4 space-y-3">
              {REQUIRED_DOCS.map((doc) => {
                const saved = form.documents_json[doc.key];
                return (
                  <div key={doc.key} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{doc.label} *</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{saved?.name || "No file uploaded"}</p>
                      </div>
                      {saved?.path && <span className="rounded-lg bg-green-50 px-2 py-1 text-xs font-bold text-green-700">Saved</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border px-3 text-xs font-bold hover:bg-muted">
                        {uploadingKey === doc.key ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
                        Upload
                        <input type="file" accept="image/*,.pdf" className="sr-only" onChange={(e) => uploadDocument(doc, e.target.files?.[0])} />
                      </label>
                      {saved?.path && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setViewer({ label: doc.label, path: saved.path })}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline" asChild><a href={saved.path} download><Download className="h-3.5 w-3.5" /></a></Button>
                          <Button size="sm" variant="outline" onClick={() => shareDocument(saved.path)}><Share2 className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline" onClick={() => printDocument(saved.path)}><Printer className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <Button className="mt-5 w-full" onClick={saveDetails} disabled={saving || Boolean(uploadingKey)}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save Details
            </Button>
          </div>
        </aside>
      </div>

      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewer(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-4">
              <p className="font-bold">{viewer.label}</p>
              <Button size="sm" variant="outline" onClick={() => setViewer(null)}>Close</Button>
            </div>
            {/\.(png|jpe?g|webp|gif)$/i.test(viewer.path) ? (
              <img src={viewer.path} alt={viewer.label} className="max-h-[75vh] w-full object-contain" />
            ) : (
              <iframe src={viewer.path} title={viewer.label} className="h-[75vh] w-full" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
