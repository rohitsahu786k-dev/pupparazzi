"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MailSearch, RotateCcw } from "lucide-react";

type EmailLog = {
  id: string;
  email_type: string;
  recipient: string;
  subject?: string | null;
  status: string;
  queued_at: string;
  attempted_at?: string | null;
  sent_at?: string | null;
  provider_message_id?: string | null;
  attempt_count: number;
  failure_reason?: string | null;
  retry_eligible: boolean;
};

const STATUSES = ["", "Queued", "Sent", "Failed", "Skipped"];
const TYPES = ["", "welcome", "password_reset", "portal_activation", "transactional"];

function fmt(value?: string | null) {
  return value ? new Date(value).toLocaleString("en-IN") : "-";
}

export default function EmailLogsPage() {
  const [rows, setRows] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    const res = await fetch(`/api/admin/email-logs?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [status, type]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Email Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search delivery status, provider IDs, failures, and retry eligibility.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}><RotateCcw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto] md:items-end">
          <label className="block text-sm font-semibold">
            Search
            <Input className="mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Recipient or subject" onKeyDown={(e) => { if (e.key === "Enter") load(); }} />
          </label>
          <label className="block text-sm font-semibold">
            Email type
            <select className="mt-1 h-11 w-full rounded-lg border bg-white px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((item) => <option key={item} value={item}>{item || "All types"}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Status
            <select className="mt-1 h-11 w-full rounded-lg border bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((item) => <option key={item} value={item}>{item || "All statuses"}</option>)}
            </select>
          </label>
          <Button onClick={load} disabled={loading}><MailSearch className="mr-2 h-4 w-4" />Apply filters</Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{total} result{total === 1 ? "" : "s"}</p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Provider ID</th>
                <th className="px-4 py-3">Failure</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-semibold">{row.email_type}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.recipient}</p>
                    <p className="max-w-xs truncate text-xs text-muted-foreground">{row.subject || "-"}</p>
                  </td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">{fmt(row.sent_at || row.attempted_at || row.queued_at)}</td>
                  <td className="px-4 py-3">{row.attempt_count}</td>
                  <td className="px-4 py-3 max-w-[180px] truncate">{row.provider_message_id || "-"}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{row.failure_reason || (row.retry_eligible ? "Retry eligible" : "-")}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>No email activity found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
