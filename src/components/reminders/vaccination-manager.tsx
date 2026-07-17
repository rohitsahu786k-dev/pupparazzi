"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Syringe, Pencil, Trash2, CheckCircle2, BellOff, Bell, Send, History, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  STATUS_BADGE_CLASS,
  REPEAT_INTERVAL_OPTIONS,
  type VaccinationStatus,
} from "@/lib/reminders/vaccine-config";
import { formatAge, nextBirthday, daysUntilBirthday, formatCalendarDate } from "@/lib/reminders/dates";

type Vaccination = {
  id: string;
  vaccine_type_id: string | null;
  vaccine_type: string;
  vaccine_label: string;
  category: string | null;
  custom_vaccine_name: string | null;
  administered_date: string | null;
  next_due_date: string;
  recommended_interval_months: number | null;
  days_remaining: number;
  status: string;
  reminder_enabled: boolean;
  reminder_recipient: string | null;
  vet_name: string | null;
  vet_contact: string | null;
  provider_name: string | null;
  administered_by: string | null;
  dose_number: string | null;
  batch_lot_number: string | null;
  notes: string | null;
  certificate_asset_id: string | null;
  certificate_path: string | null;
  source: string;
  verification_status: string;
};

type VaccineOption = {
  id: string;
  key: string;
  display_name: string;
  category: string;
  default_interval_months: number | null;
};

type Delivery = {
  id: string;
  reminder_type: string;
  status: string;
  recipient: string | null;
  subject: string | null;
  scheduled_for: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
};

type FormState = {
  vaccine_type_id: string;
  vaccine_type: string;
  type_display_name: string;
  category: string;
  custom_vaccine_name: string;
  administered_date: string;
  next_due_date: string;
  recommended_interval_months: string;
  reminder_enabled: boolean;
  reminder_recipient: string;
  vet_name: string;
  vet_contact: string;
  provider_name: string;
  administered_by: string;
  dose_number: string;
  batch_lot_number: string;
  notes: string;
  certificate_asset_id: string;
  certificate_path: string;
  certificate_name: string;
};

const EMPTY_FORM: FormState = {
  vaccine_type_id: "",
  vaccine_type: "anti_rabies",
  type_display_name: "Anti-Rabies Vaccine",
  category: "vaccine",
  custom_vaccine_name: "",
  administered_date: "",
  next_due_date: "",
  recommended_interval_months: "12",
  reminder_enabled: true,
  reminder_recipient: "",
  vet_name: "",
  vet_contact: "",
  provider_name: "",
  administered_by: "",
  dose_number: "",
  batch_lot_number: "",
  notes: "",
  certificate_asset_id: "",
  certificate_path: "",
  certificate_name: "",
};

const CERT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";
const CERT_MAX_BYTES = 2 * 1024 * 1024;

/** Upload a certificate via the shared /api/upload endpoint; returns {id, path}. */
async function uploadCertificate(file: File, petId: string, ownerId?: string): Promise<{ id: string; path: string }> {
  if (file.size > CERT_MAX_BYTES) throw new Error("File is too large. Please upload up to 2 MB.");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", "vaccination");
  fd.append("category", "Vaccination");
  fd.append("documentType", "Vaccination Record Certificate");
  fd.append("petId", petId);
  if (ownerId) fd.append("clientId", ownerId);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return { id: data.id, path: data.path || data.url || "" };
}

function isoToInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function addMonthsToInput(baseIso: string | null, months: number): string {
  const base = baseIso ? new Date(baseIso) : new Date();
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, base.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

export default function VaccinationManager({
  petId,
  ownerId,
  dob,
  dobIsEstimated,
  birthdayReminderEnabled: initialBirthdayEnabled,
  canManageOwnerReminders = true,
  isOperations = false,
}: {
  petId: string;
  ownerId?: string;
  petName: string;
  dob: string | null;
  dobIsEstimated?: boolean;
  birthdayReminderEnabled?: boolean;
  canManageOwnerReminders?: boolean;
  isOperations?: boolean;
}) {
  const [items, setItems] = useState<Vaccination[]>([]);
  const [vaccineOptions, setVaccineOptions] = useState<VaccineOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [birthdayEnabled, setBirthdayEnabled] = useState(initialBirthdayEnabled ?? true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [completeId, setCompleteId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<Delivery[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/pets/${petId}/vaccinations`);
    if (res.ok) {
      setItems(await res.json());
      setError("");
    } else {
      setError("Unable to load vaccination records.");
    }
    setLoading(false);
  }, [petId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/vaccine-treatment-types")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        const options = Array.isArray(data) ? data : [];
        setVaccineOptions(options);
        const first = options[0];
        if (first) {
          setForm((current) => ({
            ...current,
            vaccine_type_id: current.vaccine_type_id || first.id,
            vaccine_type: current.vaccine_type || first.key,
            type_display_name: current.type_display_name || first.display_name,
            category: current.category || first.category,
            recommended_interval_months: current.recommended_interval_months || String(first.default_interval_months ?? ""),
          }));
        }
      })
      .catch(() => setVaccineOptions([]));
  }, []);

  const dobDate = useMemo(() => (dob ? new Date(dob) : null), [dob]);
  const birthdayInfo = useMemo(() => {
    if (!dobDate) return null;
    const next = nextBirthday(dobDate);
    const days = daysUntilBirthday(dobDate);
    return { next: formatCalendarDate(next), days };
  }, [dobDate]);

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 4000);
  }

  function openAdd() {
    setEditingId(null);
    const first = vaccineOptions[0];
    const interval = first?.default_interval_months ?? 12;
    setForm({
      ...EMPTY_FORM,
      vaccine_type_id: first?.id || "",
      vaccine_type: first?.key || EMPTY_FORM.vaccine_type,
      type_display_name: first?.display_name || EMPTY_FORM.type_display_name,
      category: first?.category || EMPTY_FORM.category,
      recommended_interval_months: String(interval),
      next_due_date: addMonthsToInput(null, interval),
    });
    setEditorOpen(true);
  }

  function openEdit(v: Vaccination) {
    setEditingId(v.id);
    setForm({
      vaccine_type: v.vaccine_type,
      vaccine_type_id: v.vaccine_type_id || "",
      type_display_name: v.vaccine_label,
      category: v.category || "",
      custom_vaccine_name: v.custom_vaccine_name || "",
      administered_date: isoToInput(v.administered_date),
      next_due_date: isoToInput(v.next_due_date),
      recommended_interval_months: v.recommended_interval_months == null ? "" : String(v.recommended_interval_months),
      reminder_enabled: v.reminder_enabled,
      reminder_recipient: v.reminder_recipient || "",
      vet_name: v.vet_name || "",
      vet_contact: v.vet_contact || "",
      provider_name: v.provider_name || "",
      administered_by: v.administered_by || "",
      dose_number: v.dose_number || "",
      batch_lot_number: v.batch_lot_number || "",
      notes: v.notes || "",
      certificate_asset_id: v.certificate_asset_id || "",
      certificate_path: v.certificate_path || "",
      certificate_name: v.certificate_path ? "Current certificate" : "",
    });
    setEditorOpen(true);
  }

  async function submitForm() {
    setError("");
    if (form.vaccine_type === "custom" && !form.custom_vaccine_name.trim()) {
      setError("Please provide a name for the custom vaccine or treatment.");
      return;
    }
    if (!form.next_due_date) {
      setError("Next due date is required.");
      return;
    }
    setSaving(true);
    const payload = {
      vaccine_type_id: form.vaccine_type_id || null,
      vaccine_type: form.vaccine_type,
      type_display_name: form.type_display_name || null,
      category: form.category || null,
      custom_vaccine_name: form.custom_vaccine_name.trim() || null,
      administered_date: form.administered_date || null,
      next_due_date: form.next_due_date,
      recommended_interval_months: form.recommended_interval_months === "" ? null : Number(form.recommended_interval_months),
      reminder_enabled: form.reminder_enabled,
      reminder_recipient: form.reminder_recipient.trim() || null,
      vet_name: form.vet_name.trim() || null,
      vet_contact: form.vet_contact.trim() || null,
      provider_name: form.provider_name.trim() || null,
      administered_by: form.administered_by.trim() || null,
      dose_number: form.dose_number.trim() || null,
      batch_lot_number: form.batch_lot_number.trim() || null,
      notes: form.notes.trim() || null,
      certificate_asset_id: form.certificate_asset_id || null,
      certificate_path: form.certificate_path || null,
    };
    const res = editingId
      ? await fetch(`/api/pets/${petId}/vaccinations/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch(`/api/pets/${petId}/vaccinations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setEditorOpen(false);
      flash(editingId ? "Vaccination updated." : "Vaccination added.");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Could not save vaccination.");
    }
    setSaving(false);
  }

  async function toggleReminder(v: Vaccination) {
    setBusyId(v.id);
    const res = await fetch(`/api/pets/${petId}/vaccinations/${v.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminder_enabled: !v.reminder_enabled }),
    });
    if (res.ok) await load(); else setError("Could not update reminder.");
    setBusyId("");
  }

  async function removeCertificate(v: Vaccination) {
    if (!confirm("Remove the certificate from this record?")) return;
    setBusyId(v.id);
    const res = await fetch(`/api/pets/${petId}/vaccinations/${v.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certificate_asset_id: null, certificate_path: null }),
    });
    if (res.ok) { flash("Certificate removed."); await load(); } else setError("Could not remove certificate.");
    setBusyId("");
  }

  async function remove(v: Vaccination) {
    if (!confirm(`Delete the ${v.vaccine_label} record? This cannot be undone.`)) return;
    setBusyId(v.id);
    const res = await fetch(`/api/pets/${petId}/vaccinations/${v.id}`, { method: "DELETE" });
    if (res.ok) { flash("Record deleted."); await load(); } else setError("Could not delete record.");
    setBusyId("");
  }

  async function sendNow(v: Vaccination) {
    if (!confirm(`Send the ${v.vaccine_label} reminder email to the pet owner now?`)) return;
    setBusyId(v.id);
    const res = await fetch(`/api/pets/${petId}/vaccinations/${v.id}/send`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "now" }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) flash("Reminder sent to the owner.");
    else setError(data.message || "Could not send reminder.");
    setBusyId("");
  }

  async function sendTest(v: Vaccination) {
    const to = prompt("Send a test copy of this reminder to which email address?");
    if (!to) return;
    setBusyId(v.id);
    const res = await fetch(`/api/pets/${petId}/vaccinations/${v.id}/send`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "test", to }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) flash(`Test reminder sent to ${to}.`);
    else setError(data.message || "Could not send test reminder.");
    setBusyId("");
  }

  async function openHistory(v: Vaccination) {
    setHistoryId(v.id);
    setHistory([]);
    const res = await fetch(`/api/pets/${petId}/vaccinations/${v.id}/history`);
    if (res.ok) setHistory(await res.json());
  }

  async function toggleBirthday() {
    const next = !birthdayEnabled;
    setBirthdayEnabled(next);
    const res = await fetch(`/api/pets`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: petId, birthday_reminder_enabled: next }),
    });
    if (!res.ok) { setBirthdayEnabled(!next); setError("Could not update birthday reminder."); }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{notice}</div>}

      {/* Birthday panel */}
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Birthday</p>
            {dobDate ? (
              <p className="mt-1 text-sm font-semibold">
                {formatCalendarDate(dobDate)}{dobIsEstimated ? " (estimated)" : ""} · {formatAge(dobDate)}
                {birthdayInfo && (
                  <span className="ml-1 font-normal text-muted-foreground">
                    · {birthdayInfo.days === 0 ? "Birthday today" : `Next birthday ${birthdayInfo.next} (${birthdayInfo.days} day${birthdayInfo.days === 1 ? "" : "s"})`}
                  </span>
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No date of birth on file. Add it in the pet details to enable birthday reminders.</p>
            )}
          </div>
          {canManageOwnerReminders && dobDate && (
            <Button size="sm" variant={birthdayEnabled ? "outline" : "secondary"} onClick={toggleBirthday}>
              {birthdayEnabled ? <Bell className="mr-2 h-3.5 w-3.5" /> : <BellOff className="mr-2 h-3.5 w-3.5" />}
              {birthdayEnabled ? "Reminders on" : "Reminders off"}
            </Button>
          )}
        </div>
      </div>

      {/* Vaccination list */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Syringe className="h-4 w-4 text-primary" />
            <p className="font-semibold">Vaccination & Medical Reminders</p>
          </div>
          <Button size="sm" onClick={openAdd}><Plus className="mr-2 h-3.5 w-3.5" />Add</Button>
        </div>

        {loading ? (
          <div className="flex h-24 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No vaccination records yet. Add one to start tracking due dates.</div>
        ) : (
          <div className="divide-y">
            {items.map((v) => {
              const badge = STATUS_BADGE_CLASS[v.status as VaccinationStatus] || STATUS_BADGE_CLASS.Upcoming;
              const dueLabel = v.days_remaining < 0
                ? `${Math.abs(v.days_remaining)} day${Math.abs(v.days_remaining) === 1 ? "" : "s"} overdue`
                : v.days_remaining === 0 ? "Due today" : `in ${v.days_remaining} day${v.days_remaining === 1 ? "" : "s"}`;
              return (
                <div key={v.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{v.vaccine_label}</p>
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge}`}>{v.status}</span>
                        {!v.reminder_enabled && <span className="text-[11px] text-muted-foreground">reminder off</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {formatCalendarDate(new Date(v.next_due_date))} · {dueLabel}
                        {v.administered_date && ` · Last: ${formatCalendarDate(new Date(v.administered_date))}`}
                      </p>
                      {(v.vet_name || v.vet_contact) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">Vet: {[v.vet_name, v.vet_contact].filter(Boolean).join(" · ")}</p>
                      )}
                      {(v.provider_name || v.administered_by || v.dose_number || v.batch_lot_number) && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[v.provider_name && `Provider: ${v.provider_name}`, v.administered_by && `Administered by: ${v.administered_by}`, v.dose_number && `Dose: ${v.dose_number}`, v.batch_lot_number && `Batch: ${v.batch_lot_number}`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Reminder {v.reminder_enabled ? "enabled" : "disabled"}{v.reminder_recipient ? ` for ${v.reminder_recipient}` : ""} · Certificate {v.certificate_path ? "available" : "not uploaded"} · {v.verification_status}
                      </p>
                      {v.notes && <p className="mt-0.5 text-xs text-muted-foreground">{v.notes}</p>}
                      {v.certificate_path && (
                        <p className="mt-0.5 text-xs">
                          <a href={v.certificate_asset_id ? `/api/assets/${v.certificate_asset_id}/file` : v.certificate_path} target="_blank" rel="noreferrer" className="text-primary underline">View certificate</a>
                          <button type="button" onClick={() => removeCertificate(v)} className="ml-3 text-muted-foreground hover:text-red-600">Remove</button>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" disabled={busyId === v.id} onClick={() => setCompleteId(v.id)} title="Mark completed"><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" disabled={busyId === v.id} onClick={() => openEdit(v)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" disabled={busyId === v.id} onClick={() => toggleReminder(v)} title={v.reminder_enabled ? "Disable reminder" : "Enable reminder"}>{v.reminder_enabled ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}</Button>
                      <Button size="sm" variant="outline" disabled={busyId === v.id} onClick={() => openHistory(v)} title="Reminder history"><History className="h-3.5 w-3.5" /></Button>
                      {isOperations && <Button size="sm" variant="outline" disabled={busyId === v.id} onClick={() => sendNow(v)} title="Send reminder now"><Send className="h-3.5 w-3.5" /></Button>}
                      {isOperations && <Button size="sm" variant="ghost" disabled={busyId === v.id} onClick={() => sendTest(v)} title="Send test email">Test</Button>}
                      <Button size="sm" variant="destructive" disabled={busyId === v.id} onClick={() => remove(v)} title="Delete">{busyId === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</Button>
                    </div>
                  </div>

                  {completeId === v.id && <CompletePanel petId={petId} ownerId={ownerId} vaccination={v} onClose={() => setCompleteId(null)} onDone={() => { setCompleteId(null); flash("Marked completed."); load(); }} />}
                  {historyId === v.id && <HistoryPanel history={history} onClose={() => setHistoryId(null)} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editorOpen && (
        <EditorModal
          form={form}
          setForm={setForm}
          saving={saving}
          editing={Boolean(editingId)}
          vaccineOptions={vaccineOptions}
          petId={petId}
          ownerId={ownerId}
          onError={setError}
          onClose={() => setEditorOpen(false)}
          onSubmit={submitForm}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function CertificateField({ form, setForm, petId, ownerId, onError }: {
  form: FormState; setForm: (f: FormState) => void; petId: string; ownerId?: string; onError: (m: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    onError("");
    try {
      const { id, path } = await uploadCertificate(file, petId, ownerId);
      setForm({ ...form, certificate_asset_id: id, certificate_path: path, certificate_name: file.name });
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
  }
  return (
    <Field label="Certificate (PDF/JPG/PNG/WebP, up to 2 MB)">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>{form.certificate_path ? "Replace file" : "Upload file"}</span>
          <input type="file" accept={CERT_ACCEPT} className="hidden" onChange={onPick} disabled={uploading} />
        </label>
        {form.certificate_path && (
          <>
            <a href={form.certificate_asset_id ? `/api/assets/${form.certificate_asset_id}/file` : form.certificate_path} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{form.certificate_name || "View"}</a>
            <button type="button" onClick={() => setForm({ ...form, certificate_asset_id: "", certificate_path: "", certificate_name: "" })} className="text-xs text-muted-foreground hover:text-red-600">Remove</button>
          </>
        )}
      </div>
    </Field>
  );
}

function EditorModal({ form, setForm, saving, editing, vaccineOptions, petId, ownerId, onError, onClose, onSubmit }: {
  form: FormState; setForm: (f: FormState) => void; saving: boolean; editing: boolean; vaccineOptions: VaccineOption[]; petId: string; ownerId?: string; onError: (m: string) => void; onClose: () => void; onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{editing ? "Edit vaccination" : "Add vaccination"}</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Vaccine / treatment">
            <select
              value={form.vaccine_type_id || form.vaccine_type}
              onChange={(e) => {
                const selected = vaccineOptions.find((option) => option.id === e.target.value || option.key === e.target.value);
                if (!selected) return setForm({ ...form, vaccine_type: e.target.value });
                const interval = selected.default_interval_months == null ? "" : String(selected.default_interval_months);
                setForm({
                  ...form,
                  vaccine_type_id: selected.id,
                  vaccine_type: selected.key,
                  type_display_name: selected.display_name,
                  category: selected.category,
                  recommended_interval_months: interval,
                  next_due_date: interval ? addMonthsToInput(form.administered_date || null, Number(interval)) : form.next_due_date,
                });
              }}
              className="h-10 w-full rounded-lg border bg-white px-2 text-sm"
            >
              {vaccineOptions.map((o) => <option key={o.id} value={o.id}>{o.display_name}</option>)}
            </select>
          </Field>
          {form.vaccine_type === "custom" && (
            <Field label="Custom name"><Input value={form.custom_vaccine_name} onChange={(e) => setForm({ ...form, custom_vaccine_name: e.target.value })} placeholder="e.g. Leptospirosis" /></Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Last administered"><Input type="date" value={form.administered_date} onChange={(e) => setForm({ ...form, administered_date: e.target.value })} /></Field>
            <Field label="Next due date *"><Input type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Recommended interval (months)"><Input type="number" min="0" value={form.recommended_interval_months} onChange={(e) => setForm({ ...form, recommended_interval_months: e.target.value })} /></Field>
            <Field label="Reminder recipient"><Input value={form.reminder_recipient} onChange={(e) => setForm({ ...form, reminder_recipient: e.target.value })} placeholder="Owner email by default" /></Field>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REPEAT_INTERVAL_OPTIONS.map((o) => (
              <button key={o.months} type="button" onClick={() => setForm({ ...form, next_due_date: addMonthsToInput(form.administered_date || null, o.months) })} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">+{o.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vet name"><Input value={form.vet_name} onChange={(e) => setForm({ ...form, vet_name: e.target.value })} /></Field>
            <Field label="Vet contact"><Input value={form.vet_contact} onChange={(e) => setForm({ ...form, vet_contact: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Provider / clinic"><Input value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} /></Field>
            <Field label="Administered by"><Input value={form.administered_by} onChange={(e) => setForm({ ...form, administered_by: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dose number"><Input value={form.dose_number} onChange={(e) => setForm({ ...form, dose_number: e.target.value })} /></Field>
            <Field label="Batch / lot number"><Input value={form.batch_lot_number} onChange={(e) => setForm({ ...form, batch_lot_number: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <CertificateField form={form} setForm={setForm} petId={petId} ownerId={ownerId} onError={onError} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.reminder_enabled} onChange={(e) => setForm({ ...form, reminder_enabled: e.target.checked })} />
            Send reminder emails for this record
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{editing ? "Save" : "Add"}</Button>
        </div>
      </div>
    </div>
  );
}

function CompletePanel({ petId, ownerId, vaccination, onClose, onDone }: { petId: string; ownerId?: string; vaccination: Vaccination; onClose: () => void; onDone: () => void }) {
  const [administered, setAdministered] = useState(new Date().toISOString().slice(0, 10));
  const [createNext, setCreateNext] = useState(true);
  const [nextDue, setNextDue] = useState(addMonthsToInput(new Date().toISOString(), 12));
  const [vetName, setVetName] = useState(vaccination.vet_name || "");
  const [vetContact, setVetContact] = useState(vaccination.vet_contact || "");
  const [certForm, setCertForm] = useState<FormState>({ ...EMPTY_FORM, certificate_asset_id: vaccination.certificate_asset_id || "", certificate_path: vaccination.certificate_path || "", certificate_name: vaccination.certificate_path ? "Current certificate" : "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setSaving(true);
    setErr("");
    const res = await fetch(`/api/pets/${petId}/vaccinations/${vaccination.id}/complete`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        administered_date: administered, create_next_cycle: createNext, next_due_date: createNext ? nextDue : null,
        vet_name: vetName || null, vet_contact: vetContact || null,
        certificate_asset_id: certForm.certificate_asset_id || null, certificate_path: certForm.certificate_path || null,
      }),
    });
    if (res.ok) onDone();
    else { const d = await res.json().catch(() => ({})); setErr(d.message || "Could not mark completed."); }
    setSaving(false);
  }

  return (
    <div className="mt-3 rounded-lg border bg-muted/30 p-4">
      <p className="mb-3 text-sm font-semibold">Mark {vaccination.vaccine_label} completed</p>
      {err && <p className="mb-2 text-xs font-medium text-red-600">{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Administered date"><Input type="date" value={administered} onChange={(e) => setAdministered(e.target.value)} /></Field>
        <Field label="Next due date"><Input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} disabled={!createNext} /></Field>
        <Field label="Vet name"><Input value={vetName} onChange={(e) => setVetName(e.target.value)} /></Field>
        <Field label="Vet contact"><Input value={vetContact} onChange={(e) => setVetContact(e.target.value)} /></Field>
      </div>
      <div className="mt-3"><CertificateField form={certForm} setForm={setCertForm} petId={petId} ownerId={ownerId} onError={setErr} /></div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={createNext} onChange={(e) => setCreateNext(e.target.checked)} />
        Open the next cycle with the due date above
      </label>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={saving}>{saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}Confirm</Button>
      </div>
    </div>
  );
}

function HistoryPanel({ history, onClose }: { history: Delivery[]; onClose: () => void }) {
  return (
    <div className="mt-3 rounded-lg border bg-muted/30 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Reminder history</p>
        <button onClick={onClose} aria-label="Close"><X className="h-4 w-4 text-muted-foreground" /></button>
      </div>
      {history.length === 0 ? (
        <p className="text-xs text-muted-foreground">No reminders sent yet.</p>
      ) : (
        <div className="space-y-1.5">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("en-IN")}</span>
              <span className="font-medium">{h.reminder_type}</span>
              <span className={h.status === "Sent" ? "text-emerald-600" : h.status === "Failed" ? "text-red-600" : "text-muted-foreground"}>{h.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
