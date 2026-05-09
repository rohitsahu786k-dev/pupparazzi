"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit3, Loader2, Plus, Trash2, TicketPercent } from "lucide-react";

type Coupon = {
  code: string;
  description: string;
  discount_type: "PERCENTAGE" | "FLAT";
  discount_value: number;
  category?: string;
  minimum_order_amount: number;
  usage_limit: number;
  expires_at: string;
  is_active: boolean;
  terms: string;
};

type CouponForm = {
  code: string;
  description: string;
  discount_type: "PERCENTAGE" | "FLAT";
  discount_value: string;
  category: string;
  minimum_order_amount: string;
  usage_limit: string;
  expires_at: string;
  is_active: boolean;
  terms: string;
};

const emptyForm: CouponForm = {
  code: "",
  description: "",
  discount_type: "PERCENTAGE" as const,
  discount_value: "",
  category: "All",
  minimum_order_amount: "0",
  usage_limit: "100",
  expires_at: "2026-12-31",
  is_active: true,
  terms: "",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCode, setEditingCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchCoupons() {
    setLoading(true);
    const res = await fetch("/api/coupons?admin=true");
    if (res.ok) {
      setCoupons(await res.json());
      setError("");
    } else {
      setError("Unable to load coupons.");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function saveCoupon() {
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      code: (editingCode || form.code).toUpperCase(),
      discount_value: Number(form.discount_value || 0),
      minimum_order_amount: Number(form.minimum_order_amount || 0),
      usage_limit: Number(form.usage_limit || 0),
      category: form.category === "All" ? undefined : form.category,
    };
    const res = await fetch("/api/coupons", {
      method: editingCode ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Coupon could not be saved.");
    } else {
      setForm(emptyForm);
      setEditingCode("");
      await fetchCoupons();
    }
    setSaving(false);
  }

  async function deleteCoupon(code: string) {
    if (!confirm(`Delete coupon ${code}?`)) return;
    setSaving(true);
    const res = await fetch(`/api/coupons?code=${encodeURIComponent(code)}`, { method: "DELETE" });
    if (!res.ok) setError("Coupon could not be deleted.");
    await fetchCoupons();
    setSaving(false);
  }

  function editCoupon(coupon: Coupon) {
    setEditingCode(coupon.code);
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value || ""),
      category: coupon.category || "All",
      minimum_order_amount: String(coupon.minimum_order_amount || 0),
      usage_limit: String(coupon.usage_limit || 0),
      expires_at: coupon.expires_at || "",
      is_active: coupon.is_active,
      terms: coupon.terms || "",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coupons</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create, edit, expire, and disable coupon codes used in booking checkout.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-4 flex items-center gap-2 font-bold">{editingCode ? <Edit3 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />} {editingCode ? `Edit ${editingCode}` : "Create coupon"}</h2>
        <div className="grid gap-3 md:grid-cols-[160px_1fr_160px_140px_140px_140px_130px]">
          <Input placeholder="Code" value={form.code} disabled={Boolean(editingCode)} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {["All", "Grooming", "Boarding", "Walking", "Swimming", "Veterinary", "Training"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as "PERCENTAGE" | "FLAT" })} className="h-11 rounded-lg border bg-white px-3 text-sm">
            <option value="PERCENTAGE">Percent</option>
            <option value="FLAT">Flat</option>
          </select>
          <Input placeholder="Value" inputMode="decimal" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value.replace(/[^\d.]/g, "") })} />
          <Input placeholder="Minimum" inputMode="decimal" value={form.minimum_order_amount} onChange={(e) => setForm({ ...form, minimum_order_amount: e.target.value.replace(/[^\d.]/g, "") })} />
          <Input placeholder="Usage" inputMode="numeric" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value.replace(/\D/g, "") })} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[160px_1fr_160px]">
          <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <Input placeholder="Terms" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
          <label className="flex h-11 items-center gap-2 rounded-lg border px-3 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={saveCoupon} disabled={saving || !form.code || !form.discount_value}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TicketPercent className="mr-2 h-4 w-4" />}
            Save coupon
          </Button>
          {editingCode && <Button variant="outline" onClick={() => { setEditingCode(""); setForm(emptyForm); }}>Cancel</Button>}
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Offer</th>
                  <th className="px-4 py-3">Rules</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {coupons.map((coupon) => (
                  <tr key={coupon.code}>
                    <td className="px-4 py-3 font-bold">{coupon.code}</td>
                    <td className="px-4 py-3">{coupon.description}<br /><span className="text-xs text-muted-foreground">{coupon.discount_type === "FLAT" ? "Rs. " : ""}{coupon.discount_value}{coupon.discount_type === "PERCENTAGE" ? "%" : ""} off</span></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{coupon.category || "All services"} · min Rs. {coupon.minimum_order_amount} · expires {coupon.expires_at || "-"}</td>
                    <td className="px-4 py-3"><span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${coupon.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{coupon.is_active ? "Active" : "Disabled"}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => editCoupon(coupon)}><Edit3 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteCoupon(coupon.code)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
