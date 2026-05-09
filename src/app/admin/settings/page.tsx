"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, Send } from "lucide-react";

type SettingsState = {
  business: Record<string, any>;
  smtp: Record<string, any>;
  payment: Record<string, any>;
  whatsapp: Record<string, any>;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [saving, setSaving] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/admin/settings");
    if (res.ok) setSettings(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function update(group: keyof SettingsState, key: string, value: any) {
    if (!settings) return;
    setSettings({ ...settings, [group]: { ...settings[group], [key]: value } });
  }

  async function save(group: keyof SettingsState) {
    if (!settings) return;
    setSaving(group);
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: group, value: settings[group] }),
    });
    setMessage(res.ok ? "Settings saved" : "Unable to save settings");
    setSaving("");
  }

  async function sendTest() {
    setSaving("test");
    const res = await fetch("/api/admin/settings/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testEmail }),
    });
    setMessage(res.ok ? "Test email sent" : "Test email failed");
    setSaving("");
  }

  if (!settings) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Business Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage business profile, SMTP, and payment gateway settings.</p>
      </div>
      {message && <div className="rounded-lg border bg-white px-4 py-3 text-sm font-medium">{message}</div>}

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 font-bold">Business Profile</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {["name", "shortName", "email", "phone", "website", "gst", "logoUrl"].map((key) => (
            <Input key={key} placeholder={key} value={settings.business[key] || ""} onChange={(e) => update("business", key, e.target.value)} />
          ))}
          <textarea className="min-h-24 rounded-lg border p-3 text-sm md:col-span-2" placeholder="Address" value={settings.business.address || ""} onChange={(e) => update("business", "address", e.target.value)} />
        </div>
        <Button className="mt-4" onClick={() => save("business")} disabled={saving === "business"}>{saving === "business" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Business</Button>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 font-bold">SMTP Settings</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Host" value={settings.smtp.host || ""} onChange={(e) => update("smtp", "host", e.target.value)} />
          <Input placeholder="Port" type="number" value={settings.smtp.port || ""} onChange={(e) => update("smtp", "port", Number(e.target.value))} />
          <Input placeholder="SMTP User" value={settings.smtp.user || ""} onChange={(e) => update("smtp", "user", e.target.value)} />
          <Input placeholder="SMTP Password" type="password" value={settings.smtp.pass || ""} onChange={(e) => update("smtp", "pass", e.target.value)} />
          <Input placeholder="From Name" value={settings.smtp.fromName || ""} onChange={(e) => update("smtp", "fromName", e.target.value)} />
          <Input placeholder="From Email" value={settings.smtp.fromEmail || ""} onChange={(e) => update("smtp", "fromEmail", e.target.value)} />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={Boolean(settings.smtp.secure)} onChange={(e) => update("smtp", "secure", e.target.checked)} />
            Use secure SMTP
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => save("smtp")} disabled={saving === "smtp"}>{saving === "smtp" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save SMTP</Button>
          <Input placeholder="Send test to email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="sm:max-w-xs" />
          <Button variant="outline" onClick={sendTest} disabled={!testEmail || saving === "test"}><Send className="mr-2 h-4 w-4" /> Test Email</Button>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 font-bold">Payment Gateway</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <select value={settings.payment.provider || "manual"} onChange={(e) => update("payment", "provider", e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
            <option value="manual">Manual</option>
            <option value="razorpay">Razorpay</option>
          </select>
          <Input placeholder="Currency" value={settings.payment.currency || "INR"} onChange={(e) => update("payment", "currency", e.target.value)} />
          <Input placeholder="Razorpay Key ID" value={settings.payment.razorpayKeyId || ""} onChange={(e) => update("payment", "razorpayKeyId", e.target.value)} />
          <Input placeholder="Razorpay Key Secret" type="password" value={settings.payment.razorpayKeySecret || ""} onChange={(e) => update("payment", "razorpayKeySecret", e.target.value)} />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={Boolean(settings.payment.enabled)} onChange={(e) => update("payment", "enabled", e.target.checked)} />
            Enable online payments
          </label>
        </div>
        <Button className="mt-4" onClick={() => save("payment")} disabled={saving === "payment"}>{saving === "payment" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Payment</Button>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 font-bold">WhatsApp Templates</h2>
        <p className="mb-4 text-sm text-muted-foreground">These templates are used for one-click WhatsApp messages from bookings. Dynamic fields: {"{{customerName}}"}, {"{{bookingId}}"}, {"{{serviceName}}"}, {"{{advanceAmount}}"}, {"{{remainingAmount}}"}.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {["bookingConfirmation", "paymentSuccess", "codAdvancePaid", "codReminder", "cancellation"].map((key) => (
            <label key={key} className="space-y-1 text-sm font-semibold">
              <span>{key}</span>
              <textarea className="min-h-24 w-full rounded-lg border p-3 text-sm font-normal" value={settings.whatsapp[key] || ""} onChange={(e) => update("whatsapp", key, e.target.value)} />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={Boolean(settings.whatsapp.enabled)} onChange={(e) => update("whatsapp", "enabled", e.target.checked)} />
            Enable WhatsApp actions
          </label>
        </div>
        <Button className="mt-4" onClick={() => save("whatsapp")} disabled={saving === "whatsapp"}>{saving === "whatsapp" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save WhatsApp</Button>
      </section>
    </div>
  );
}
