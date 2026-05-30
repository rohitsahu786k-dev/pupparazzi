"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Edit3, Loader2, Plus, Star, Trash2, X } from "lucide-react";

type Testimonial = {
  id: string;
  name: string;
  pet_name?: string | null;
  pet_breed?: string | null;
  rating: number;
  text: string;
  image?: string | null;
  is_active: boolean;
  order: number;
};

const emptyForm = { name: "", pet_name: "", pet_breed: "", rating: "5", text: "", image: "", is_active: true, order: "0" };

export default function AdminTestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState("");

  async function fetchAll() {
    setLoading(true);
    const res = await fetch("/api/testimonials?admin=true");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  async function handleSave() {
    if (!form.name || !form.text) { setError("Name and review text are required"); return; }
    setSaving(true); setError(""); setMessage("");
    const payload = { ...form, rating: parseInt(form.rating) || 5, order: parseInt(form.order) || 0 };
    const url = editId ? `/api/testimonials/${editId}` : "/api/testimonials";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setMessage(editId ? "Updated!" : "Created!");
      setForm(emptyForm); setEditId("");
      await fetchAll();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.message || "Failed to save");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    await fetch(`/api/testimonials/${id}`, { method: "DELETE" });
    await fetchAll();
  }

  function startEdit(t: Testimonial) {
    setEditId(t.id);
    setForm({ name: t.name, pet_name: t.pet_name || "", pet_breed: t.pet_breed || "", rating: String(t.rating), text: t.text, image: t.image || "", is_active: t.is_active, order: String(t.order) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Testimonials</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage customer reviews displayed on the homepage.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" />{message}</div>}

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          {editId ? <Edit3 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
          {editId ? "Edit Testimonial" : "Add Testimonial"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Client Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Pet Name" value={form.pet_name} onChange={(e) => setForm({ ...form, pet_name: e.target.value })} />
          <Input placeholder="Pet Breed" value={form.pet_breed} onChange={(e) => setForm({ ...form, pet_breed: e.target.value })} />
          <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Stars</option>)}
          </select>
        </div>
        <textarea
          placeholder="Review text *"
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          className="mt-3 h-24 w-full rounded-lg border px-3 py-2 text-sm"
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Input placeholder="Image URL (optional)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          <Input placeholder="Display Order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
          <label className="flex h-11 items-center gap-2 rounded-lg border px-3 text-sm">
            <input type="checkbox" checked={form.is_active as boolean} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {editId ? "Update" : "Add"} Testimonial
          </Button>
          {editId && <Button variant="outline" onClick={() => { setEditId(""); setForm(emptyForm); }}>Cancel</Button>}
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No testimonials yet. Add one above.</div>
        ) : (
          <div className="divide-y">
            {items.map((t) => (
              <div key={t.id} className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {t.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{t.name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}
                    </div>
                    {!t.is_active && <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">Hidden</span>}
                  </div>
                  {(t.pet_name || t.pet_breed) && (
                    <p className="text-xs text-muted-foreground">{[t.pet_name, t.pet_breed].filter(Boolean).join(", ")}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{t.text}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => startEdit(t)}><Edit3 className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
