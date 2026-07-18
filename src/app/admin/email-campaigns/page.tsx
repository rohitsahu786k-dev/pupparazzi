"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MailCheck, Pause, Play, RotateCcw, StopCircle } from "lucide-react";

type Campaign = {
  id: string;
  campaign_type: string;
  status: string;
  daily_cap?: number | null;
  reserved_quota: number;
  total_eligible: number;
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
  activated: number;
  created_at: string;
};

type Preview = {
  eligibleCount: number;
  sentToday: number;
  providerAvailableCapacity: number | null;
  dailyCampaignCapacity: number;
  settings: { providerDailyQuota: number | null; dailyCap: number; reservedQuota: number; throttleMs: number };
  campaigns: Campaign[];
};

function fmt(value: number | null | undefined) {
  return value === null || value === undefined ? "Configured quota required" : value.toLocaleString("en-IN");
}

export default function EmailCampaignsPage() {
  const [data, setData] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [providerDailyQuota, setProviderDailyQuota] = useState("");
  const [dailyCap, setDailyCap] = useState("100");
  const active = data?.campaigns?.find((campaign) => ["Running", "Paused", "Draft"].includes(campaign.status));

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/email-campaigns");
    if (res.ok) {
      const json = await res.json();
      setData(json);
      setProviderDailyQuota(json.settings.providerDailyQuota?.toString() || "");
      setDailyCap(json.settings.dailyCap?.toString() || "100");
    }
    setLoading(false);
  }

  async function saveSettings() {
    setLoading(true);
    await fetch("/api/admin/email-campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerDailyQuota: providerDailyQuota ? Number(providerDailyQuota) : null,
        dailyCap: Number(dailyCap || 0),
      }),
    });
    await load();
  }

  async function start() {
    setLoading(true);
    await fetch("/api/admin/email-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyCap: Number(dailyCap || 0) }),
    });
    await load();
  }

  async function action(id: string, body: object) {
    setLoading(true);
    await fetch(`/api/admin/email-campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Portal Activation Campaign</h1>
          <p className="mt-1 text-sm text-muted-foreground">Send migrated customers exactly one secure account setup invitation.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}><RotateCcw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Eligible customers" value={data?.eligibleCount ?? 0} />
        <Stat label="Provider available today" value={fmt(data?.providerAvailableCapacity)} />
        <Stat label="Reserved quota" value={data?.settings.reservedQuota ?? 50} />
        <Stat label="Campaign capacity today" value={data?.dailyCampaignCapacity ?? 0} />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[180px_180px_auto_1fr] md:items-end">
          <label className="block text-sm font-semibold">
            Provider daily quota
            <Input className="mt-1" type="number" min="0" value={providerDailyQuota} onChange={(e) => setProviderDailyQuota(e.target.value)} placeholder="Required" />
          </label>
          <label className="block text-sm font-semibold">
            Campaign daily cap
            <Input className="mt-1" type="number" min="0" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} />
          </label>
          <Button variant="outline" onClick={saveSettings} disabled={loading}>Save settings</Button>
          <p className="text-sm text-muted-foreground">Capacity is provider quota remaining minus 50 reserved emails, capped by this campaign limit.</p>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold">Current campaign</h2>
            <p className="text-sm text-muted-foreground">{active ? `${active.status} - ${active.sent} sent, ${active.failed} failed, ${active.queued} queued` : "No active campaign."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!active && <Button onClick={start} disabled={loading || !data?.eligibleCount || data.providerAvailableCapacity === null}><MailCheck className="mr-2 h-4 w-4" />Start campaign</Button>}
            {active && active.status !== "Running" && <Button onClick={() => action(active.id, { status: "Running" })} disabled={loading}><Play className="mr-2 h-4 w-4" />Resume</Button>}
            {active && active.status === "Running" && <Button variant="outline" onClick={() => action(active.id, { action: "process" })} disabled={loading}><Play className="mr-2 h-4 w-4" />Process batch</Button>}
            {active && active.status === "Running" && <Button variant="outline" onClick={() => action(active.id, { status: "Paused" })} disabled={loading}><Pause className="mr-2 h-4 w-4" />Pause</Button>}
            {active && <Button variant="outline" onClick={() => action(active.id, { action: "retry_failed" })} disabled={loading || active.failed === 0}>Retry failed</Button>}
            {active && <Button variant="destructive" onClick={() => action(active.id, { status: "Stopped" })} disabled={loading}><StopCircle className="mr-2 h-4 w-4" />Stop</Button>}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-3">Created</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Eligible</th><th className="px-4 py-3">Queued</th><th className="px-4 py-3">Sent</th><th className="px-4 py-3">Failed</th><th className="px-4 py-3">Skipped</th><th className="px-4 py-3">Activated</th></tr>
          </thead>
          <tbody className="divide-y">
            {(data?.campaigns || []).map((campaign) => (
              <tr key={campaign.id}>
                <td className="px-4 py-3">{new Date(campaign.created_at).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 font-semibold">{campaign.status}</td>
                <td className="px-4 py-3">{campaign.total_eligible}</td>
                <td className="px-4 py-3">{campaign.queued}</td>
                <td className="px-4 py-3">{campaign.sent}</td>
                <td className="px-4 py-3">{campaign.failed}</td>
                <td className="px-4 py-3">{campaign.skipped}</td>
                <td className="px-4 py-3">{campaign.activated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
