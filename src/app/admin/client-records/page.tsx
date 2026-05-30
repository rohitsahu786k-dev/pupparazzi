"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2, Download, Eye, Loader2, Plus, Search,
  Trash2, Upload, X, ChevronLeft, ChevronRight, Edit2
} from "lucide-react";

type ClientRecord = {
  id: string;
  pet_id_number?: number | null;
  name: string;
  phone: string;
  email?: string | null;
  pet_name?: string | null;
  pet_type?: string | null;
  breed?: string | null;
  gender?: string | null;
  pet_birthday?: string | null;
  address?: string | null;
  latest_booking_date?: string | null;
  onboarding_date?: string | null;
  number_of_bookings?: number | null;
  number_of_sessions?: number | null;
  status?: string | null;
  coat?: string | null;
  breed_size?: string | null;
  weight_kg?: number | null;
  dietary_preference?: string | null;
  vaccination_status?: string | null;
  wallet_balance?: number | null;
  outstanding_balance?: number | null;
  created_at?: string;
  [key: string]: unknown;
};

const FORM_FIELDS = [
  { key: "pet_id_number", label: "Pet ID", type: "number" },
  { key: "name", label: "Name *", type: "text" },
  { key: "phone", label: "Phone Number *", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "pet_name", label: "Pet Name", type: "text" },
  { key: "pet_type", label: "Pet Type", type: "select", options: ["Dog", "Cat", "Bird", "Other"] },
  { key: "breed", label: "Breed", type: "text" },
  { key: "gender", label: "Gender", type: "select", options: ["Male", "Female"] },
  { key: "pet_birthday", label: "Pet Birthday", type: "text" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "onboarding_date", label: "Onboarding Date", type: "text" },
  { key: "number_of_bookings", label: "Number of Bookings", type: "number" },
  { key: "number_of_sessions", label: "Number of Sessions", type: "number" },
  { key: "client_tags", label: "Client Tags", type: "text" },
  { key: "home_outlet", label: "Home Outlet", type: "text" },
  { key: "coat", label: "Coat", type: "select", options: ["Short", "Long", "Combination"] },
  { key: "breed_size", label: "Breed Size", type: "select", options: ["Small", "Medium", "Large"] },
  { key: "weight_kg", label: "Weight (kg)", type: "number" },
  { key: "anti_rabies", label: "Anti Rabies Date", type: "text" },
  { key: "dhppil", label: "DHPPiL (9-in-1) Date", type: "text" },
  { key: "corona", label: "Corona Date", type: "text" },
  { key: "kennel_cough", label: "Kennel Cough Date", type: "text" },
  { key: "local_guardian_name", label: "Local Guardian Name", type: "text" },
  { key: "local_guardian_contact", label: "Local Guardian Contact", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["Active", "Inactive", "Archived"] },
  { key: "archive_reason", label: "Archive Reason", type: "text" },
  { key: "pet_social_media", label: "Pet Social Media Handle", type: "text" },
  { key: "consent_photos", label: "Consent To Use Pet Photos", type: "select", options: ["Yes", "No"] },
  { key: "special_occasion", label: "Special Occasion", type: "text" },
  { key: "special_occasion_date", label: "Special Occasion Date", type: "text" },
  { key: "microchip_number", label: "Microchip Number", type: "text" },
  { key: "adoption_status", label: "Adoption Status", type: "text" },
  { key: "neutered_or_spayed", label: "Neutered Or Spayed", type: "select", options: ["Yes", "No"] },
  { key: "last_heat_month", label: "Last Heat Month", type: "text" },
  { key: "last_heat_year", label: "Last Heat Year", type: "text" },
  { key: "first_walk_schedule", label: "First Walk Schedule", type: "text" },
  { key: "second_walk_schedule", label: "Second Walk Schedule", type: "text" },
  { key: "third_walk_schedule", label: "Third Walk Schedule", type: "text" },
  { key: "dietary_preference", label: "Dietary Preference", type: "select", options: ["Vegetarian", "Non-vegetarian", "Eggetarian"] },
  { key: "additional_meals", label: "Additional Meals", type: "textarea" },
  { key: "preferences_or_allergies", label: "Preferences Or Allergies", type: "textarea" },
  { key: "vaccination_status", label: "Vaccination Status", type: "select", options: ["Vaccinated", "Not vaccinated", "Partial"] },
  { key: "tick_prevention", label: "Tick Prevention", type: "select", options: ["Yes", "No"] },
  { key: "last_tick_prevention_date", label: "Last Tick Prevention Date", type: "text" },
  { key: "tick_prevention_method", label: "Tick Prevention Method", type: "text" },
  { key: "ongoing_medication", label: "Ongoing Medication", type: "select", options: ["Yes", "No"] },
  { key: "medication_detail", label: "Medication Detail", type: "textarea" },
  { key: "major_illness_history", label: "Major Illness History", type: "textarea" },
  { key: "deworming_date", label: "Deworming Date", type: "text" },
  { key: "veterinarian_name", label: "Veterinarian Name", type: "text" },
  { key: "veterinarian_contact", label: "Veterinarian Contact", type: "text" },
  { key: "tc_accepted", label: "T&C Accepted", type: "select", options: ["Yes", "No"] },
  { key: "wallet_balance", label: "Wallet Balance", type: "number" },
  { key: "outstanding_balance", label: "Outstanding Balance", type: "number" },
];

function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (current.trim()) lines.push(current);
      current = "";
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);
  if (lines.length < 2) return [];

  function splitRow(line: string): string[] {
    const fields: string[] = [];
    let field = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { field += '"'; i++; }
        else inQ = !inQ;
      } else if (c === "," && !inQ) {
        fields.push(field); field = "";
      } else {
        field += c;
      }
    }
    fields.push(field);
    return fields;
  }

  const headers = splitRow(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitRow(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h.trim()] = (values[idx] || "").trim(); });
    rows.push(obj);
  }
  return rows;
}

export default function ClientRecordsPage() {
  const [records, setRecords] = useState<ClientRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<ClientRecord | null>(null);
  const [editRecord, setEditRecord] = useState<ClientRecord | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (statusFilter !== "All") params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("limit", "50");
    const res = await fetch(`/api/client-records?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data.records);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } else {
      setError("Failed to load records");
    }
    setLoading(false);
  }, [query, statusFilter, page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError("");
    setMessage("");
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setError("No valid data found in CSV file");
        setImporting(false);
        return;
      }
      const res = await fetch("/api/client-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, records: rows }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setImportResult(data);
        setPage(1);
        await fetchRecords();
      } else {
        setError(data.message || "Import failed");
      }
    } catch (err: any) {
      setError(err.message || "Failed to read file");
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleExport() {
    const res = await fetch("/api/client-records/export");
    if (!res.ok) { setError("Export failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreate() {
    if (!form.name || !form.phone) {
      setError("Name and Phone are required");
      return;
    }
    setCreating(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/client-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMessage("Client created successfully");
      setForm({});
      setShowCreate(false);
      setPage(1);
      await fetchRecords();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Failed to create client");
    }
    setCreating(false);
  }

  async function handleUpdate() {
    if (!editRecord) return;
    setCreating(true);
    setError("");
    setMessage("");
    const body: any = { id: editRecord.id };
    for (const field of FORM_FIELDS) {
      body[field.key] = form[field.key] || "";
    }
    const res = await fetch("/api/client-records", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setMessage("Client updated successfully");
      setForm({});
      setEditRecord(null);
      await fetchRecords();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Failed to update");
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this client record permanently?")) return;
    setError("");
    const res = await fetch(`/api/client-records?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Record deleted");
      await fetchRecords();
    } else {
      setError("Failed to delete");
    }
  }

  function openEdit(record: ClientRecord) {
    const f: Record<string, string> = {};
    for (const field of FORM_FIELDS) {
      f[field.key] = record[field.key] != null ? String(record[field.key]) : "";
    }
    setForm(f);
    setEditRecord(record);
    setShowCreate(false);
    setShowDetail(null);
  }

  function openCreate() {
    setForm({});
    setEditRecord(null);
    setShowCreate(true);
    setShowDetail(null);
  }

  // Render form (used for both create and edit)
  function renderForm() {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
        <div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {editRecord ? "Edit Client" : "Create New Client"}
            </h2>
            <button onClick={() => { setShowCreate(false); setEditRecord(null); setForm({}); }}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-2 sm:grid-cols-2 lg:grid-cols-3">
            {FORM_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-gray-600">{field.label}</label>
                {field.type === "select" ? (
                  <select
                    value={form[field.key] || ""}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
                  >
                    <option value="">-- Select --</option>
                    {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    value={form[field.key] || ""}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="h-20 w-full rounded-lg border px-3 py-2 text-sm"
                    rows={2}
                  />
                ) : (
                  <Input
                    type={field.type}
                    value={form[field.key] || ""}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={editRecord ? handleUpdate : handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editRecord ? "Update Client" : "Create Client"}
            </Button>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditRecord(null); setForm({}); }}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render detail view
  function renderDetail() {
    if (!showDetail) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
        <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">{showDetail.name} - {showDetail.pet_name || "No Pet"}</h2>
            <button onClick={() => setShowDetail(null)}><X className="h-5 w-5" /></button>
          </div>
          <div className="grid max-h-[70vh] gap-3 overflow-y-auto pr-2 sm:grid-cols-2 lg:grid-cols-3">
            {FORM_FIELDS.map((field) => {
              const val = showDetail[field.key];
              return (
                <div key={field.key} className="rounded-lg border p-2">
                  <p className="text-xs font-medium text-gray-500">{field.label}</p>
                  <p className="text-sm">{val != null && val !== "" ? String(val) : "-"}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={() => { openEdit(showDetail); }}>
              <Edit2 className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" onClick={() => setShowDetail(null)}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Records</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Import, export, and manage all client &amp; pet data. Total: {total} records
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Create Client
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import CSV
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={total === 0}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button className="ml-2 font-bold" onClick={() => setError("")}>×</button>
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" /> {message}
          <button className="ml-auto font-bold" onClick={() => setMessage("")}>×</button>
        </div>
      )}
      {importResult && importResult.errors?.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          <p className="font-medium">Import warnings ({importResult.errors.length}):</p>
          <ul className="mt-1 list-inside list-disc">
            {importResult.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
          </ul>
        </div>
      )}

      {/* Search & Filter */}
      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchRecords(); } }}
              placeholder="Search by name, phone, email, pet name, breed..."
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-11 rounded-lg border bg-white px-3 text-sm"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Archived">Archived</option>
          </select>
          <Button variant="outline" onClick={() => { setPage(1); fetchRecords(); }}>Search</Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No client records found. Import a CSV or create one manually.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">Pet ID</th>
                  <th className="px-3 py-3">Client Name</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Pet Name</th>
                  <th className="px-3 py-3">Breed</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Bookings</th>
                  <th className="px-3 py-3">Balance</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-3 py-3 font-mono text-xs">{r.pet_id_number || "-"}</td>
                    <td className="px-3 py-3 font-medium">{r.name}</td>
                    <td className="px-3 py-3 text-xs">{r.phone}</td>
                    <td className="px-3 py-3">{r.pet_name || "-"}</td>
                    <td className="px-3 py-3 text-xs">{r.breed || "-"}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                        r.status === "Active" ? "bg-green-50 text-green-700" :
                        r.status === "Inactive" ? "bg-red-50 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{r.status || "-"}</span>
                    </td>
                    <td className="px-3 py-3 text-xs">{r.number_of_bookings || 0}</td>
                    <td className="px-3 py-3 text-xs font-mono">
                      ₹{(r.outstanding_balance || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => setShowDetail(r)} className="rounded p-1.5 hover:bg-muted" title="View">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEdit(r)} className="rounded p-1.5 hover:bg-muted" title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} ({total} records)
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showCreate || editRecord) && renderForm()}
      {showDetail && renderDetail()}
    </div>
  );
}
