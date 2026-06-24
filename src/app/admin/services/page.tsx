"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit3, Loader2, Plus, Search, Trash2 } from "lucide-react";

type Service = {
  id: string;
  name: string;
  category: string;
  service_group?: string | null;
  breed_size?: string | null;
  coat_type?: string | null;
  session_count?: number | null;
  display_order: number;
  description_short?: string | null;
  price: number;
  discounted_price?: number | null;
  slot_duration_mins: number;
  max_slots_per_day?: number | null;
  is_active: boolean;
  is_bestseller: boolean;
  free_services_json?: string[] | null;
  images_json?: string[] | null;
  addons?: { id?: string; name: string; description?: string | null; price: number; is_active?: boolean }[];
};

const emptyForm = {
  id: "",
  name: "",
  category: "Grooming",
  service_group: "Complete Grooming",
  breed_size: "",
  coat_type: "",
  session_count: "",
  display_order: "0",
  description_short: "",
  price: "",
  discounted_price: "",
  slot_duration_mins: "60",
  max_slots_per_day: "",
  free_services_json: "",
  images_json: "",
  addons: [{ name: "", description: "", price: "" }],
  is_active: true,
  is_bestseller: false,
};

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchServices() {
    setLoading(true);
    const res = await fetch("/api/services?includeInactive=true");
    if (res.ok) {
      setServices(await res.json());
      setError("");
    } else {
      setError("Unable to load services.");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchServices();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return services.filter((service) => {
      if (groupFilter !== "All" && (service.service_group || service.category) !== groupFilter) return false;
      if (!needle) return true;
      return [service.name, service.category, service.service_group, service.breed_size, service.coat_type, service.description_short].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [groupFilter, query, services]);
  const serviceGroups = useMemo(() => Array.from(new Set(services.map((service) => service.service_group || service.category))), [services]);
  const categoryOptions = useMemo(() => Array.from(new Set(["Grooming", "Boarding", ...services.map((service) => service.category)])), [services]);
  const serviceGroupOptions = useMemo(() => Array.from(new Set([
    "Complete Grooming",
    "Individual Grooming",
    "Standard Boarding",
    "Boarding Packages",
    ...services.map((service) => service.service_group || service.category),
  ])), [services]);
  const groupedFiltered = useMemo(() => {
    const grouped = new Map<string, Map<string, Service[]>>();
    for (const service of filtered) {
      const category = service.category || "Other";
      const group = service.service_group || category;
      if (!grouped.has(category)) grouped.set(category, new Map());
      const categoryGroups = grouped.get(category)!;
      categoryGroups.set(group, [...(categoryGroups.get(group) || []), service]);
    }
    return Array.from(grouped.entries()).map(([category, groups]) => ({
      category,
      groups: Array.from(groups.entries()).map(([group, items]) => ({ group, items })),
    }));
  }, [filtered]);

  async function saveService() {
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      price: Number(form.price || 0),
      discounted_price: form.discounted_price,
      slot_duration_mins: Number(form.slot_duration_mins || 60),
      session_count: form.session_count,
      display_order: Number(form.display_order || 0),
      max_slots_per_day: form.max_slots_per_day,
      free_services_json: form.free_services_json,
      images_json: form.images_json,
      addons: form.addons
        .map((addon) => ({ name: addon.name.trim(), description: addon.description.trim(), price: Number(addon.price || 0), is_active: true }))
        .filter((addon) => addon.name),
    };
    const res = await fetch("/api/services", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Service could not be saved.");
    } else {
      setForm(emptyForm);
      await fetchServices();
    }
    setSaving(false);
  }

  async function deleteService(id: string) {
    if (!confirm("Delete this service permanently? Existing bookings may still reference it.")) return;
    setSaving(true);
    const res = await fetch(`/api/services?id=${id}`, { method: "DELETE" });
    if (!res.ok) setError("Service could not be deleted.");
    await fetchServices();
    setSaving(false);
  }

  function editService(service: Service) {
    setForm({
      id: service.id,
      name: service.name,
      category: service.category,
      service_group: service.service_group || "",
      breed_size: service.breed_size || "",
      coat_type: service.coat_type || "",
      session_count: service.session_count ? String(service.session_count) : "",
      display_order: String(service.display_order || 0),
      description_short: service.description_short || "",
      price: String(service.price || ""),
      discounted_price: service.discounted_price ? String(service.discounted_price) : "",
      slot_duration_mins: String(service.slot_duration_mins || 60),
      max_slots_per_day: service.max_slots_per_day ? String(service.max_slots_per_day) : "",
      free_services_json: Array.isArray(service.free_services_json) ? service.free_services_json.join("\n") : "",
      images_json: Array.isArray(service.images_json) ? service.images_json.join("\n") : "",
      addons: service.addons?.length
        ? service.addons.map((addon) => ({ name: addon.name, description: addon.description || "", price: String(addon.price || "") }))
        : [{ name: "", description: "", price: "" }],
      is_active: service.is_active,
      is_bestseller: service.is_bestseller,
    });
  }

  function updateAddon(index: number, key: "name" | "description" | "price", value: string) {
    setForm((prev) => ({
      ...prev,
      addons: prev.addons.map((addon, addonIndex) => addonIndex === index ? { ...addon, [key]: value } : addon),
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Services</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage boarding, grooming packages, prices, offers, availability, and public booking status.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-4 flex items-center gap-2 font-bold">{form.id ? <Edit3 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />} {form.id ? "Edit service" : "Add service"}</h2>
          <div className="space-y-3">
            <Input placeholder="Service name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
                {categoryOptions.map((category) => <option key={category}>{category}</option>)}
              </select>
              <Input placeholder="Duration mins" inputMode="numeric" value={form.slot_duration_mins} onChange={(e) => setForm({ ...form, slot_duration_mins: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={form.service_group} onChange={(e) => setForm({ ...form, service_group: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
                {serviceGroupOptions.map((group) => <option key={group}>{group}</option>)}
              </select>
              <Input placeholder="Display order" inputMode="numeric" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value.replace(/\D/g, "") })} />
            </div>
            {form.service_group === "Complete Grooming" && <div className="grid grid-cols-3 gap-2">
              <select value={form.breed_size} onChange={(e) => setForm({ ...form, breed_size: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm"><option value="">Breed size</option>{["Small Breed", "Large Breed", "Extra Large Breed"].map((item) => <option key={item}>{item}</option>)}</select>
              <select value={form.coat_type} onChange={(e) => setForm({ ...form, coat_type: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm"><option value="">Coat type</option><option>Long Coat</option><option>Short Coat</option></select>
              <select value={form.session_count} onChange={(e) => setForm({ ...form, session_count: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm"><option value="">Sessions</option>{[1, 6, 12, 24].map((item) => <option key={item} value={item}>{item === 1 ? "Single" : `${item} Sessions`}</option>)}</select>
            </div>}
            <Input placeholder="Short description" value={form.description_short} onChange={(e) => setForm({ ...form, description_short: e.target.value })} />
            <textarea
              placeholder="Included items, one per line"
              value={form.free_services_json}
              onChange={(e) => setForm({ ...form, free_services_json: e.target.value })}
              className="min-h-24 w-full rounded-lg border bg-white p-3 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <textarea
              placeholder="Image paths/URLs, one per line"
              value={form.images_json}
              onChange={(e) => setForm({ ...form, images_json: e.target.value })}
              className="min-h-20 w-full rounded-lg border bg-white p-3 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Price" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, "") })} />
              <Input placeholder="Offer price" inputMode="decimal" value={form.discounted_price} onChange={(e) => setForm({ ...form, discounted_price: e.target.value.replace(/[^\d.]/g, "") })} />
              <Input placeholder="Slots/day" inputMode="numeric" value={form.max_slots_per_day} onChange={(e) => setForm({ ...form, max_slots_per_day: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold">Add-ons</p>
                <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, addons: [...form.addons, { name: "", description: "", price: "" }] })}>Add row</Button>
              </div>
              <div className="space-y-2">
                {form.addons.map((addon, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_100px_40px]">
                    <Input placeholder="Name" value={addon.name} onChange={(e) => updateAddon(index, "name", e.target.value)} />
                    <Input placeholder="Description" value={addon.description} onChange={(e) => updateAddon(index, "description", e.target.value)} />
                    <Input placeholder="Price" inputMode="decimal" value={addon.price} onChange={(e) => updateAddon(index, "price", e.target.value.replace(/[^\d.]/g, ""))} />
                    <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, addons: form.addons.filter((_, addonIndex) => addonIndex !== index) })}>×</Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2 rounded-lg border p-3"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
              <label className="flex items-center gap-2 rounded-lg border p-3"><input type="checkbox" checked={form.is_bestseller} onChange={(e) => setForm({ ...form, is_bestseller: e.target.checked })} /> Bestseller</label>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={saveService} disabled={saving || !form.name || !form.price}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save service
              </Button>
              {form.id && <Button type="button" variant="outline" onClick={() => setForm(emptyForm)}>Cancel</Button>}
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-white">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search service, package, category..." className="pl-9" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["All", ...serviceGroups].map((group) => <button key={group} type="button" onClick={() => setGroupFilter(group)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${groupFilter === group ? "border-primary bg-primary text-white" : "bg-white text-muted-foreground"}`}>{group} ({group === "All" ? services.length : services.filter((service) => (service.service_group || service.category) === group).length})</button>)}
            </div>
          </div>
          {loading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
            <div className="grid gap-3 p-3 lg:hidden">
              {filtered.map((service) => (
                <div key={service.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{service.name}</p>
                      <p className="mt-1 text-xs font-semibold text-primary">{service.service_group || service.category}{service.breed_size ? ` · ${service.breed_size}` : ""}{service.coat_type ? ` · ${service.coat_type}` : ""}{service.session_count ? ` · ${service.session_count === 1 ? "Single session" : `${service.session_count} sessions`}` : ""}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{service.description_short || "-"}</p>
                    </div>
                    <span className={`shrink-0 rounded-lg border px-2 py-1 text-xs font-bold ${service.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                      {service.is_active ? "Available" : "Disabled"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-muted/45 p-2">
                      <p className="text-muted-foreground">Category</p>
                      <p className="mt-1 font-bold">{service.category}</p>
                    </div>
                    <div className="rounded-lg bg-muted/45 p-2">
                      <p className="text-muted-foreground">Price</p>
                      <p className="mt-1 font-bold">{service.discounted_price ? money(service.discounted_price) : money(service.price)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/45 p-2">
                      <p className="text-muted-foreground">Duration</p>
                      <p className="mt-1 font-bold">{service.slot_duration_mins} min</p>
                    </div>
                    <div className="rounded-lg bg-muted/45 p-2">
                      <p className="text-muted-foreground">Slots</p>
                      <p className="mt-1 font-bold">{service.max_slots_per_day || "No cap"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => editService(service)}><Edit3 className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteService(service.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-225 text-left text-sm">
                <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Availability</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groupedFiltered.flatMap((category) => category.groups.flatMap((group) => [
                    <tr key={`${category.category}-${group.group}`} className="bg-muted/35">
                      <td colSpan={5} className="px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{category.category}</p>
                        <p className="mt-1 text-sm font-bold text-foreground">{group.group} <span className="text-xs font-medium text-muted-foreground">({group.items.length} services)</span></p>
                      </td>
                    </tr>,
                    ...group.items.map((service) => (
                    <tr key={service.id} className="align-top hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-bold">{service.name}</p>
                        <p className="mt-1 text-xs font-semibold text-primary">{service.service_group || service.category}{service.breed_size ? ` · ${service.breed_size}` : ""}{service.coat_type ? ` · ${service.coat_type}` : ""}{service.session_count ? ` · ${service.session_count === 1 ? "Single session" : `${service.session_count} sessions`}` : ""}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{service.description_short || "-"}</p>
                        {service.addons?.length ? <p className="mt-1 text-xs text-primary">{service.addons.length} add-ons</p> : null}
                      </td>
                      <td className="px-4 py-3">{service.category}</td>
                      <td className="px-4 py-3 font-bold">
                        {service.discounted_price ? <><span className="mr-2 text-muted-foreground line-through">{money(service.price)}</span>{money(service.discounted_price)}</> : money(service.price)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${service.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{service.is_active ? "Available" : "Disabled"}</span>
                        <p className="mt-2 text-xs text-muted-foreground">{service.max_slots_per_day ? `${service.max_slots_per_day} slots/day` : "No daily cap"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => editService(service)}><Edit3 className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteService(service.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                    )),
                  ]))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
