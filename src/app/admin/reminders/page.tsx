"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Play, RefreshCw, Cake, Syringe, AlertTriangle, Mail, XCircle, BellOff } from "lucide-react";
import type { ReminderSettings } from "@/lib/reminders/settings";

type Summary = {
  timezone: string;
  date: string;
  birthdaysToday: number;
  birthdaysNext7: number;
  vaccinationsDueToday: number;
  vaccinationsNext7: number;
  vaccinationsOverdue: number;
  emailsSentToday: number;
  failedEmailsToday: number;
  disabledReminders: number;
};

type Delivery = {
  id: string; reminder_type: string; status: string; recipient: string | null; subject: string | null;
  scheduled_for: string; sent_at: string | null; error_message: string | null; created_at: string;
  pet_name: string | null; owner_name: string | null; owner_email: string | null;
};

const TYPE_OPTIONS = ["", "birthday", "birthday_greeting", "vaccination_due_soon", "vaccination_due_today", "vaccination_overdue", "vaccination_manual", "admin_summary"];
const STATUS_OPTIONS = ["", "Sent", "Failed", "Skipped", "Pending", "Processing"];

function StatCard({ icon, label, value, tone = "" }: { icon: React.ReactNode; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default function AdminRemindersPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const pageSize = 25;

  const loadSummary = useCallback(async () => {
    const res = await fetch("/api/admin/reminders/summary");
    if (res.ok) setSummary(await res.json());
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/admin/reminders/settings");
    if (res.ok) setSettings(await res.json());
  }, []);

  const loadDeliveries = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/reminders/deliveries?${params}`);
    if (res.ok) { const data = await res.json(); setDeliveries(data.items); setTotal(data.total); }
  }, [page, typeFilter, statusFilter]);

  useEffect(() => { loadSummary(); loadSettings(); }, [loadSummary, loadSettings]);
  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(""), 5000); }

  async function runNow() {
    setRunning(true); setError("");
    const res = await fetch("/api/admin/reminders/run", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      flash(`Processed. Sent ${data.sent}, skipped ${data.skipped}, failed ${data.failed} (birthdays ${data.birthdayCandidates}, vaccinations ${data.vaccinationCandidates}).`);
      await Promise.all([loadSummary(), loadDeliveries()]);
    } else setError(data.message || "Reminder run failed.");
    setRunning(false);
  }

  async function saveSettings(patch: Partial<ReminderSettings>) {
    if (!settings) return;
    setSavingSettings(true);
    const res = await fetch("/api/admin/reminders/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (res.ok) { setSettings(await res.json()); flash("Settings saved."); }
    else setError("Could not save settings.");
    setSavingSettings(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Birthday & vaccination reminders{summary ? ` · ${summary.timezone} · ${summary.date}` : ""}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { loadSummary(); loadDeliveries(); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          <Button onClick={runNow} disabled={running}>{running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}Run reminders now</Button>
        </div>
      </div>

      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={<Cake className="h-4 w-4" />} label="Birthdays today" value={summary.birthdaysToday} />
          <StatCard icon={<Cake className="h-4 w-4" />} label="Birthdays (7d)" value={summary.birthdaysNext7} />
          <StatCard icon={<Syringe className="h-4 w-4" />} label="Vaccinations due today" value={summary.vaccinationsDueToday} tone="text-orange-600" />
          <StatCard icon={<Syringe className="h-4 w-4" />} label="Vaccinations (7d)" value={summary.vaccinationsNext7} />
          <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Overdue" value={summary.vaccinationsOverdue} tone="text-red-600" />
          <StatCard icon={<Mail className="h-4 w-4" />} label="Emails sent today" value={summary.emailsSentToday} tone="text-emerald-600" />
          <StatCard icon={<XCircle className="h-4 w-4" />} label="Failed today" value={summary.failedEmailsToday} tone={summary.failedEmailsToday ? "text-red-600" : ""} />
          <StatCard icon={<BellOff className="h-4 w-4" />} label="Disabled reminders" value={summary.disabledReminders} />
        </div>
      )}

      {/* Settings */}
      <div className="rounded-lg border bg-white">
        <button onClick={() => setShowSettings((s) => !s)} className="flex w-full items-center justify-between p-4 text-left">
          <span className="font-semibold">Reminder settings</span>
          <span className="text-sm text-muted-foreground">{showSettings ? "Hide" : "Edit"}</span>
        </button>
        {showSettings && settings && (
          <div className="space-y-4 border-t p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Toggle label="Birthday reminders enabled" checked={settings.birthdayRemindersEnabled} onChange={(v) => saveSettings({ birthdayRemindersEnabled: v })} />
              <Toggle label="Vaccination reminders enabled" checked={settings.vaccinationRemindersEnabled} onChange={(v) => saveSettings({ vaccinationRemindersEnabled: v })} />
              <Toggle label="Send birthday greeting on the day" checked={settings.birthdaySendGreetingOnDay} onChange={(v) => saveSettings({ birthdaySendGreetingOnDay: v })} />
              <Toggle label="Admin daily summary email" checked={settings.adminSummaryEnabled} onChange={(v) => saveSettings({ adminSummaryEnabled: v })} />
            </div>
            <DaysField label="Birthday reminder days (before)" value={settings.birthdayReminderDays} onSave={(days) => saveSettings({ birthdayReminderDays: days })} />
            <DaysField label="Vaccination reminder days (before due)" value={settings.vaccinationReminderDays} onSave={(days) => saveSettings({ vaccinationReminderDays: days })} />
            <DaysField label="Vaccination overdue days (after due)" value={settings.vaccinationOverdueDays} onSave={(days) => saveSettings({ vaccinationOverdueDays: days })} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Due-soon threshold (days)</span>
                <Input type="number" defaultValue={settings.dueSoonThresholdDays} min={1} max={365} onBlur={(e) => saveSettings({ dueSoonThresholdDays: Number(e.target.value) })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Feb 29 birthdays fall on</span>
                <select defaultValue={settings.feb29Handling} onChange={(e) => saveSettings({ feb29Handling: e.target.value as "feb28" | "mar1" })} className="h-11 w-full rounded-lg border bg-white px-3 text-sm">
                  <option value="feb28">Feb 28</option>
                  <option value="mar1">Mar 1</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Business timezone (IANA)</span>
                <Input defaultValue={settings.timezone} onBlur={(e) => saveSettings({ timezone: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">Admin summary recipient</span>
                <Input defaultValue={settings.adminSummaryRecipient} onBlur={(e) => saveSettings({ adminSummaryRecipient: e.target.value })} />
              </label>
            </div>
            {savingSettings && <p className="text-xs text-muted-foreground"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Saving…</p>}
          </div>
        )}
      </div>

      {/* Deliveries */}
      <div className="rounded-lg border bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <p className="mr-auto font-semibold">Delivery history</p>
          <select value={typeFilter} onChange={(e) => { setPage(1); setTypeFilter(e.target.value); }} className="h-9 rounded-lg border bg-white px-2 text-xs">
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t || "All types"}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }} className="h-9 rounded-lg border bg-white px-2 text-xs">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-left text-sm">
            <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Pet</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deliveries.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No deliveries recorded yet.</td></tr>
              ) : deliveries.map((d) => (
                <tr key={d.id} className="align-top">
                  <td className="px-4 py-3 font-medium">{d.pet_name || "—"}</td>
                  <td className="px-4 py-3">{d.owner_name || "—"}<br /><span className="text-xs text-muted-foreground">{d.owner_email || ""}</span></td>
                  <td className="px-4 py-3 text-xs">{d.reminder_type}</td>
                  <td className="px-4 py-3 text-xs">{d.recipient || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.status === "Sent" ? "bg-emerald-50 text-emerald-700" : d.status === "Failed" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{d.status}</span>
                    {d.error_message && <p className="mt-1 max-w-60 truncate text-[11px] text-red-500" title={d.error_message}>{d.error_message}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t p-3 text-sm">
          <span className="text-muted-foreground">{total} total</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <span className="text-xs">Page {page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}

function DaysField({ label, value, onSave }: { label: string; value: number[]; onSave: (days: number[]) => void }) {
  const [text, setText] = useState(value.join(", "));
  useEffect(() => { setText(value.join(", ")); }, [value]);
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. 30, 14, 7, 3, 1, 0" />
        <Button size="sm" variant="outline" onClick={() => onSave(text.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)))}>Save</Button>
      </div>
    </label>
  );
}
