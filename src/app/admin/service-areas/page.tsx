"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin, Plus, Trash2, ToggleLeft, ToggleRight,
  Loader2, Globe, Search,
} from "lucide-react";

type ServiceArea = {
  id: string;
  city: string;
  area_name?: string;
  pincode: string;
  state: string;
  country: string;
  is_active: boolean;
  created_at: string;
};

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir",
  "Ladakh","Puducherry","Chandigarh","Dadra & Nagar Haveli","Daman & Diu",
];

export default function ServiceAreasPage() {
  const [areas, setAreas]       = useState<ServiceArea[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [form, setForm]         = useState({ pincode: "", city: "", area_name: "", state: "Gujarat" });

  useEffect(() => {
    fetch("/api/service-areas")
      .then(r => r.json())
      .then(d => setAreas(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  async function addArea() {
    if (!form.pincode || !form.city) { setError("Pincode and city are required"); return; }
    if (!/^\d{6}$/.test(form.pincode)) { setError("Pincode must be exactly 6 digits"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/service-areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, country: "India" }),
    });
    if (res.ok) {
      const area = await res.json();
      setAreas(prev => [area, ...prev]);
      setForm({ pincode: "", city: "", area_name: "", state: "Gujarat" });
    } else {
      const err = await res.json();
      setError(err.message || "Failed to add area");
    }
    setSaving(false);
  }

  async function toggleArea(id: string, current: boolean) {
    const res = await fetch("/api/service-areas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
    if (res.ok) setAreas(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a));
  }

  async function deleteArea(id: string) {
    if (!confirm("Remove this service area? Customers will no longer be able to book from this pincode.")) return;
    const res = await fetch(`/api/service-areas?id=${id}`, { method: "DELETE" });
    if (res.ok) setAreas(prev => prev.filter(a => a.id !== id));
  }

  const filtered = areas.filter(a =>
    a.pincode.includes(search) ||
    a.city.toLowerCase().includes(search.toLowerCase()) ||
    (a.area_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    a.state.toLowerCase().includes(search.toLowerCase())
  );

  const active   = areas.filter(a => a.is_active).length;
  const inactive = areas.length - active;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Service Areas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage which pincodes you serve. Only India is supported.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-[10px] text-sm font-bold border border-accent/20">
          <Globe className="h-4 w-4" />
          India Only
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Areas", value: areas.length, color: "text-foreground" },
          { label: "Active",      value: active,       color: "text-green-600" },
          { label: "Inactive",    value: inactive,     color: "text-red-500"   },
        ].map(s => (
          <Card key={s.label} className="border-border/50 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Form */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Add New Service Area
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-[10px] mb-4">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <Input
              placeholder="Pincode * (6 digits)"
              value={form.pincode}
              maxLength={6}
              onChange={e => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
            />
            <Input
              placeholder="City *"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
            />
            <Input
              placeholder="Area / Locality (optional)"
              value={form.area_name}
              onChange={e => setForm({ ...form, area_name: e.target.value })}
            />
            <select
              value={form.state}
              onChange={e => setForm({ ...form, state: e.target.value })}
              className="h-11 border border-input rounded-[10px] px-3 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <Button onClick={addArea} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Service Area
          </Button>
        </CardContent>
      </Card>

      {/* Areas List */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            All Areas ({filtered.length})
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pincode, city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-56 h-9 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-border" />
              <p className="text-sm font-semibold">
                {search ? "No areas match your search" : "No service areas added yet"}
              </p>
              {!search && <p className="text-xs mt-1">Use the form above to add your first serviceable pincode.</p>}
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map(area => (
                <div key={area.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${area.is_active ? "bg-green-500" : "bg-slate-300"}`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-foreground tracking-wider">{area.pincode}</span>
                        <span className="text-sm font-semibold text-foreground">{area.city}</span>
                        {area.area_name && (
                          <span className="text-xs text-muted-foreground">— {area.area_name}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{area.state}, India</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-[10px] ${
                      area.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {area.is_active ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => toggleArea(area.id, area.is_active)}
                      className={`p-1.5 rounded-[10px] transition-colors ${
                        area.is_active
                          ? "text-green-600 hover:bg-green-50"
                          : "text-slate-400 hover:bg-slate-100"
                      }`}
                      title={area.is_active ? "Deactivate" : "Activate"}
                    >
                      {area.is_active
                        ? <ToggleRight className="h-5 w-5" />
                        : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => deleteArea(area.id)}
                      className="p-1.5 rounded-[10px] text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete area"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
