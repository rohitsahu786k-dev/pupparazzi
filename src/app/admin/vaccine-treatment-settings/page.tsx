"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Archive, Edit3, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

type VaccineType = {
  id: string;
  key: string;
  display_name: string;
  category: string;
  default_interval_months?: number | null;
  is_active: boolean;
  archived_at?: string | null;
  display_order: number;
  reference_count?: number;
};

const CATEGORIES = [
  ["vaccine", "Vaccine"],
  ["deworming", "Deworming"],
  ["parasite_prevention", "Parasite prevention"],
  ["custom_treatment", "Custom treatment"],
];

const EMPTY = {
  display_name: "",
  category: "vaccine",
  default_interval_months: "",
  display_order: "100",
  is_active: true,
};

export default function VaccineTreatmentSettingsPage() {
  const [items, setItems] = useState<VaccineType[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/admin/vaccine-treatment-types?includeInactive=true");
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => { load(); }, []);

  function edit(item: VaccineType) {
    setEditingId(item.id);
    setForm({
      display_name: item.display_name,
      category: item.category,
      default_interval_months: item.default_interval_months == null ? "" : String(item.default_interval_months),
      display_order: String(item.display_order || 0),
      is_active: item.is_active,
    });
  }

  async function save() {
    setMessage("");
    const payload = {
      ...form,
      id: editingId || undefined,
      default_interval_months: form.default_interval_months === "" ? null : Number(form.default_interval_months),
      display_order: Number(form.display_order || 0),
    };
    const res = await fetch("/api/admin/vaccine-treatment-types", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Saved." : data.message || "Unable to save.");
    if (res.ok) {
      setEditingId("");
      setForm(EMPTY);
      await load();
    }
  }

  async function archive(item: VaccineType) {
    if (!confirm(`Archive ${item.display_name}? Historical records will remain intact.`)) return;
    const res = await fetch("/api/admin/vaccine-treatment-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, archived: true }),
    });
    setMessage(res.ok ? "Archived." : "Unable to archive.");
    await load();
  }

  async function restore(item: VaccineType) {
    const res = await fetch("/api/admin/vaccine-treatment-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, archived: false, is_active: true }),
    });
    setMessage(res.ok ? "Restored." : "Unable to restore.");
    await load();
  }

  async function remove(item: VaccineType) {
    const referenced = (item.reference_count || 0) > 0;
    const action = referenced ? "archive it instead because records already reference it" : "permanently delete it";
    if (!confirm(`Delete ${item.display_name}? This will ${action}.`)) return;
    const res = await fetch(`/api/admin/vaccine-treatment-types?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? data.message || "Deleted." : data.message || "Unable to delete.");
    if (editingId === item.id) {
      setEditingId("");
      setForm(EMPTY);
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Vaccine & Treatment Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage selectable medical record types without rewriting historical records.</p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_180px_160px_120px_120px] lg:items-end">
          <label className="block text-sm font-semibold">
            Display name
            <Input className="mt-1" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Vaccine or treatment name" />
          </label>
          <label className="block text-sm font-semibold">
            Category
            <select className="mt-1 h-11 w-full rounded-lg border bg-white px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Interval months
            <Input className="mt-1" type="number" min="0" value={form.default_interval_months} onChange={(e) => setForm({ ...form, default_interval_months: e.target.value })} placeholder="Optional" />
          </label>
          <label className="block text-sm font-semibold">
            Order
            <Input className="mt-1" type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
          </label>
          <div className="flex gap-2">
            <Button className="flex-1 lg:flex-none" onClick={save}>{editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{editingId ? "Save" : "Add"}</Button>
            {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(""); setForm(EMPTY); }}>Cancel</Button>}
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          Active
        </label>
      </div>

      {message && <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm font-medium">{message}</div>}

      <div className="hidden overflow-hidden rounded-lg border bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Interval</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">References</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className={item.archived_at ? "bg-slate-50 text-muted-foreground" : ""}>
                  <td className="px-4 py-3 font-semibold">{item.display_name}</td>
                  <td className="px-4 py-3">{CATEGORIES.find(([value]) => value === item.category)?.[1] || item.category}</td>
                  <td className="px-4 py-3">{item.default_interval_months == null ? "-" : `${item.default_interval_months} months`}</td>
                  <td className="px-4 py-3">{item.display_order}</td>
                  <td className="px-4 py-3">{item.reference_count || 0}</td>
                  <td className="px-4 py-3">{item.archived_at ? "Archived" : item.is_active ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => edit(item)}><Edit3 className="mr-1 h-3.5 w-3.5" />Edit</Button>
                      {item.archived_at ? (
                        <Button size="sm" variant="outline" onClick={() => restore(item)}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restore</Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => archive(item)}><Archive className="mr-1 h-3.5 w-3.5" />Archive</Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => remove(item)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => (
          <div key={item.id} className={`rounded-lg border bg-white p-4 ${item.archived_at ? "bg-slate-50 text-muted-foreground" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-semibold">{item.display_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{CATEGORIES.find(([value]) => value === item.category)?.[1] || item.category}</p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold">{item.archived_at ? "Archived" : item.is_active ? "Active" : "Inactive"}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div><span className="block text-muted-foreground">Interval</span><span className="font-medium">{item.default_interval_months == null ? "-" : `${item.default_interval_months} mo`}</span></div>
              <div><span className="block text-muted-foreground">Order</span><span className="font-medium">{item.display_order}</span></div>
              <div><span className="block text-muted-foreground">Refs</span><span className="font-medium">{item.reference_count || 0}</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => edit(item)}><Edit3 className="mr-1 h-3.5 w-3.5" />Edit</Button>
              {item.archived_at ? (
                <Button size="sm" variant="outline" onClick={() => restore(item)}><RotateCcw className="mr-1 h-3.5 w-3.5" />Restore</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => archive(item)}><Archive className="mr-1 h-3.5 w-3.5" />Archive</Button>
              )}
              <Button className="col-span-2" size="sm" variant="destructive" onClick={() => remove(item)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
