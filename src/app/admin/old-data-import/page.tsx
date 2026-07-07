"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Database, Eye, FileText, Loader2, Search, UploadCloud } from "lucide-react";

type Summary = Record<string, any>;
type ProfileListItem = {
  id: string;
  client_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  pet_names_json?: string[] | null;
  summary_json?: Record<string, any> | null;
  import_date?: string;
};
type ProfileDetail = ProfileListItem & {
  client_details_json?: Record<string, any> | null;
  pet_details_json?: Record<string, any>[] | null;
  health_details_json?: Record<string, any>[] | null;
  booking_history_json?: Record<string, any>[] | null;
  boarding_history_json?: Record<string, any>[] | null;
  grooming_history_json?: Record<string, any>[] | null;
  invoice_history_json?: Record<string, any>[] | null;
  payment_history_json?: Record<string, any>[] | null;
  timeline_json?: { type: string; date: string; title: string; item: Record<string, any> }[] | null;
  raw_sources_json?: Record<string, any[]> | null;
};

const FILTERS = ["All history", "Bookings", "Boarding", "Grooming", "Invoices", "Payments", "Paid", "Unpaid", "Due"];

function money(value: unknown) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "Not available";
  return String(value);
}

function Stat({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{String(value)}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-4">
      <h3 className="font-bold">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function KeyValueGrid({ data }: { data?: Record<string, any> | null }) {
  const entries = Object.entries(data || {}).filter(([key]) => key !== "raw");
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border bg-muted/25 p-2">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">{key.replace(/_/g, " ")}</p>
          <p className="mt-1 break-words text-sm">{display(value)}</p>
        </div>
      ))}
    </div>
  );
}

function Rows({ rows, empty = "No records found." }: { rows?: Record<string, any>[] | null; empty?: string }) {
  if (!rows?.length) return <p className="rounded-lg border bg-muted/25 p-3 text-sm text-muted-foreground">{empty}</p>;
  const keys = Object.keys(rows[0]).filter((key) => key !== "raw");
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>{keys.map((key) => <th key={key} className="px-3 py-2">{key.replace(/_/g, " ")}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={index}>
              {keys.map((key) => (
                <td key={key} className="max-w-64 break-words px-3 py-2 align-top">{display(row[key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OldDataImportPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileDetail | null>(null);
  const [query, setQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState("All history");
  const [petFilter, setPetFilter] = useState("All pets");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [root, setRoot] = useState("");

  async function fetchProfiles() {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("limit", "50");
    const res = await fetch(`/api/admin/old-data-import?${params.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) setProfiles(data.profiles || []);
    else setError(data.message || "Unable to load imported profiles.");
    setLoading(false);
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function preview() {
    if (!root.trim()) {
      setError("Enter the old-data export folder path first.");
      return;
    }
    setWorking(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/old-data-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "preview", root: root.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSummary(data.summary);
      setMessage("Review ready. Confirm import only after checking the totals.");
    } else {
      setError(data.error || data.message || "Preview failed.");
    }
    setWorking(false);
  }

  async function runImport() {
    if (!summary) {
      setError("Preview first, then confirm import.");
      return;
    }
    if (!confirm("This will save the final import to MongoDB. Existing data will not be overwritten. Continue?")) return;
    setWorking(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/old-data-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "import", root: root.trim(), importPdfs: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSummary(data.summary);
      setMessage(`Import complete. Profiles: ${data.report?.importedProfiles || 0}, PDFs: ${data.report?.pdfAssetsImported || 0}.`);
      await fetchProfiles();
    } else {
      setError(data.error || data.message || "Import failed.");
    }
    setWorking(false);
  }

  async function openProfile(id: string) {
    setWorking(true);
    setError("");
    const res = await fetch(`/api/admin/old-data-import?profileId=${id}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSelectedProfile(data);
      setHistoryFilter("All history");
      setPetFilter("All pets");
    } else {
      setError(data.message || "Profile could not be loaded.");
    }
    setWorking(false);
  }

  const selectedPets = useMemo(() => {
    const pets = selectedProfile?.pet_details_json?.map((pet) => String(pet.pet_name || "")).filter(Boolean) || [];
    return ["All pets", ...Array.from(new Set(pets))];
  }, [selectedProfile]);

  const filteredTimeline = useMemo(() => {
    let rows = selectedProfile?.timeline_json || [];
    if (historyFilter !== "All history") {
      rows = rows.filter((row) => {
        if (historyFilter === "Bookings") return row.type === "Booking";
        if (historyFilter === "Invoices") return row.type === "Invoice";
        if (historyFilter === "Payments") return row.type === "Payment";
        if (["Boarding", "Grooming"].includes(historyFilter)) return row.type === historyFilter;
        if (["Paid", "Unpaid", "Due"].includes(historyFilter)) return String(row.item?.payment_status || "").includes(historyFilter);
        return true;
      });
    }
    if (petFilter !== "All pets") rows = rows.filter((row) => JSON.stringify(row.item || {}).toLowerCase().includes(petFilter.toLowerCase()));
    if (dateFrom) rows = rows.filter((row) => new Date(row.date) >= new Date(dateFrom));
    if (dateTo) rows = rows.filter((row) => new Date(row.date) <= new Date(dateTo));
    return rows;
  }, [dateFrom, dateTo, historyFilter, petFilter, selectedProfile]);

  const selectedSummary = selectedProfile?.summary_json || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Old Data Import</h1>
          <p className="mt-1 text-sm text-muted-foreground">Preview, import, and review complete old client-wise history from MongoDB.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs font-bold text-muted-foreground">Export folder path</label>
            <Input
              value={root}
              onChange={(e) => setRoot(e.target.value)}
              placeholder="e.g. D:/exports/old-data"
              className="h-9 w-64"
            />
          </div>
          <Button variant="outline" onClick={preview} disabled={working}>
            {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Preview Old Data
          </Button>
          <Button onClick={runImport} disabled={working || !summary}>
            {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Confirm Import
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}
      {message && <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700"><CheckCircle2 className="h-4 w-4" /> {message}</div>}

      {summary && (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="font-bold">Import Review</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total clients found" value={summary.totalClientsFound} />
            <Stat label="New clients" value={summary.newClients} />
            <Stat label="Existing matched" value={summary.existingMatchedClients} />
            <Stat label="Possible duplicates" value={summary.duplicatePossibleClients} />
            <Stat label="Total pets" value={summary.totalPets} />
            <Stat label="Bookings" value={summary.totalBookings} />
            <Stat label="Boarding" value={summary.totalBoarding} />
            <Stat label="Grooming" value={summary.totalGrooming} />
            <Stat label="Invoices" value={summary.totalInvoices} />
            <Stat label="Paid amount" value={money(summary.totalPaidAmount)} />
            <Stat label="Due amount" value={money(summary.totalDueAmount)} />
            <Stat label="Invoice PDFs" value={summary.invoicePdfFiles} />
            <Stat label="Missing phone/email" value={summary.missingPhoneEmailRecords} />
            <Stat label="Missing invoice PDFs" value={summary.missingInvoicePdfRecords} />
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="rounded-lg border bg-white">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchProfiles()} placeholder="Search imported client..." className="pl-9" />
            </div>
            <Button className="mt-2 w-full" variant="outline" onClick={fetchProfiles}>Search</Button>
          </div>
          {loading ? (
            <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="max-h-[720px] overflow-y-auto p-2">
              {profiles.map((profile) => (
                <button key={profile.id} type="button" onClick={() => openProfile(profile.id)} className={`mb-2 w-full rounded-lg border p-3 text-left hover:border-primary ${selectedProfile?.id === profile.id ? "border-primary bg-primary/5" : "bg-white"}`}>
                  <p className="font-bold">{profile.client_name || "Not available"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{profile.phone || profile.email || "No phone/email"}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{Array.isArray(profile.pet_names_json) ? profile.pet_names_json.join(", ") : "No pets"}</p>
                </button>
              ))}
              {!profiles.length && <p className="p-4 text-center text-sm text-muted-foreground">No imported profiles yet.</p>}
            </div>
          )}
        </section>

        <section className="space-y-4">
          {!selectedProfile ? (
            <div className="rounded-lg border bg-white p-10 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto mb-3 h-8 w-8 text-primary" />
              Select a client to view full imported history.
            </div>
          ) : (
            <>
              <div className="rounded-lg border bg-foreground p-5 text-white">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm text-white/65">Client Profile</p>
                    <h2 className="text-2xl font-extrabold">{selectedProfile.client_name || "Not available"}</h2>
                    <p className="mt-1 text-sm text-white/70">{selectedProfile.phone || "No phone"} · {selectedProfile.email || "No email"}</p>
                  </div>
                  <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => setSelectedProfile(null)}>Close</Button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Stat label="Bookings" value={selectedSummary.total_bookings || 0} />
                  <Stat label="Grooming" value={selectedSummary.total_grooming_sessions || 0} />
                  <Stat label="Boarding" value={selectedSummary.total_boarding_bookings || 0} />
                  <Stat label="Invoices" value={selectedSummary.total_invoices || 0} />
                  <Stat label="Revenue" value={money(selectedSummary.total_revenue)} />
                  <Stat label="Paid" value={money(selectedSummary.total_paid)} />
                  <Stat label="Due" value={money(selectedSummary.total_due)} />
                  <Stat label="Wallet" value={money(selectedSummary.wallet_balance)} />
                  <Stat label="Outstanding" value={money(selectedSummary.outstanding_balance)} />
                  <Stat label="Last booking" value={selectedSummary.last_booking_date || "Not available"} />
                </div>
              </div>

              <Section title="Client Details"><KeyValueGrid data={selectedProfile.client_details_json} /></Section>
              <Section title="Pet Details"><Rows rows={selectedProfile.pet_details_json} /></Section>
              <Section title="Health Details"><Rows rows={selectedProfile.health_details_json} /></Section>

              <Section title="History Timeline">
                <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm">
                    {FILTERS.map((filter) => <option key={filter}>{filter}</option>)}
                  </select>
                  <select value={petFilter} onChange={(e) => setPetFilter(e.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm">
                    {selectedPets.map((pet) => <option key={pet}>{pet}</option>)}
                  </select>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  {filteredTimeline.map((entry, index) => (
                    <div key={`${entry.type}-${index}`} className="rounded-lg border p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-bold">{entry.title}</p>
                          <p className="text-xs text-muted-foreground">{entry.type} · {entry.date || "Not available"}</p>
                        </div>
                        {"pdf_path" in entry.item && entry.item.pdf_path ? (
                          <Button size="sm" variant="outline" asChild><a href={String(entry.item.pdf_path)} target="_blank" rel="noreferrer"><Eye className="mr-1 h-3.5 w-3.5" /> View Invoice PDF</a></Button>
                        ) : entry.type === "Invoice" ? <span className="text-xs font-semibold text-muted-foreground">PDF not available</span> : null}
                      </div>
                      <div className="mt-3"><KeyValueGrid data={entry.item} /></div>
                    </div>
                  ))}
                  {!filteredTimeline.length && <p className="rounded-lg border bg-muted/25 p-3 text-sm text-muted-foreground">No timeline entries match these filters.</p>}
                </div>
              </Section>

              <Section title="Booking History"><Rows rows={selectedProfile.booking_history_json} /></Section>
              <Section title="Boarding History"><Rows rows={selectedProfile.boarding_history_json} /></Section>
              <Section title="Grooming History"><Rows rows={selectedProfile.grooming_history_json} /></Section>
              <Section title="Invoice & Payment History">
                <Rows rows={selectedProfile.invoice_history_json} />
                <div className="mt-4"><Rows rows={selectedProfile.payment_history_json} /></div>
              </Section>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
