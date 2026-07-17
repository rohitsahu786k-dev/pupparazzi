"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Pause, Play, RotateCcw, Square } from "lucide-react";

type Preview = {
  eligible: number;
  capacity: number;
  reservedQuota: number;
  dailyBatchCap: number;
  providerDailyQuota: number;
  providerDailyUsed: number;
  estimatedDays: number | null;
};

type Campaign = {
  id: string;
  status: string;
  total_eligible: number;
  queued: number;
  sent: number;
  failed: number;
  skipped: number;
  daily_cap?: number | null;
  created_at: string;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function ActivationCampaignsPage() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dailyCap, setDailyCap] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [previewRes, campaignsRes] = await Promise.all([
      fetch("/api/admin/activation-campaigns?preview=true"),
      fetch("/api/admin/activation-campaigns"),
    ]);
    if (previewRes.ok) setPreview(await previewRes.json());
    if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
  }

  useEffect(() => { load(); }, []);

  async function action(actionName: string, campaignId?: string) {
    setBusy(`${actionName}:${campaignId || "new"}`);
    setMessage("");
    const res = await fetch("/api/admin/activation-campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, campaignId, dailyCap: dailyCap ? Number(dailyCap) : undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Campaign updated." : data.message || "Campaign action failed.");
    await load();
    setBusy("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Portal Activation Campaign</h1>
          <p className="mt-1 text-sm text-muted-foreground">Send migrated customers one secure account setup invitation with quota reserve protection.</p>
        </div>
        <Button variant="outline" onClick={load}><RotateCcw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Eligible now" value={preview?.eligible ?? "-"} />
        <Stat label="Daily campaign capacity" value={preview?.capacity ?? "-"} />
        <Stat label="Reserved for operations" value={preview?.reservedQuota ?? 50} />
        <Stat label="Estimated days" value={preview?.estimatedDays ?? "Not available"} />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block text-sm font-semibold">
            Campaign daily batch cap
            <Input className="mt-1" type="number" min="1" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} placeholder={String(preview?.dailyBatchCap || 100)} />
          </label>
          <Button onClick={() => action("start")} disabled={Boolean(busy)}>
            {busy === "start:new" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Start campaign
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Provider quota is configured as {preview?.providerDailyQuota || 0} sends/day with {preview?.providerDailyUsed || 0} marked used today. The processor always leaves the configured reserve untouched.
        </p>
      </div>

      {message && <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm font-medium">{message}</div>}

      <div className="rounded-lg border bg-white">
        <div className="border-b p-4">
          <h2 className="font-bold">Campaigns</h2>
        </div>
        <div className="divide-y">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-bold">{campaign.status} - {new Date(campaign.created_at).toLocaleString("en-IN")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Eligible {campaign.total_eligible} - Queued {campaign.queued} - Sent {campaign.sent} - Failed {campaign.failed} - Skipped {campaign.skipped}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => action("process", campaign.id)} disabled={Boolean(busy)}>
                  <Play className="mr-1 h-3.5 w-3.5" />Process batch
                </Button>
                {campaign.status === "Running" ? (
                  <Button size="sm" variant="outline" onClick={() => action("pause", campaign.id)}><Pause className="mr-1 h-3.5 w-3.5" />Pause</Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => action("resume", campaign.id)}><Play className="mr-1 h-3.5 w-3.5" />Resume</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => action("stop", campaign.id)}><Square className="mr-1 h-3.5 w-3.5" />Stop</Button>
              </div>
            </div>
          ))}
          {!campaigns.length && <p className="p-4 text-sm text-muted-foreground">No activation campaigns have been created yet.</p>}
        </div>
      </div>
    </div>
  );
}
