"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Loader2, Plus, Save, Send, Trash2 } from "lucide-react";
import type { HomepageCarouselItem, HomepageFaq, HomepageFeature, HomepageSlide } from "@/lib/homepage-content";

type SettingsState = {
  business: Record<string, any>;
  smtp: Record<string, any>;
  payment: Record<string, any>;
  homepage: Record<string, any>;
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

  function updateHomepageArray<T extends HomepageSlide | HomepageFeature | HomepageFaq | HomepageCarouselItem>(key: string, index: number, field: keyof T, value: any) {
    if (!settings) return;
    const items = [...(settings.homepage[key] || [])];
    items[index] = { ...items[index], [field]: value };
    update("homepage", key, items);
  }

  function addHomepageItem(key: "heroSlides" | "features" | "faqs" | "bottomItems") {
    if (!settings) return;
    const blank = {
      heroSlides: { title: "", subtitle: "", image: "", mobileImage: "", overlayOpacity: 68, textPosition: "left", sortOrder: (settings.homepage.heroSlides || []).length + 1, isActive: true, cta: "Book Now", href: "/book", secondary: "Contact", secondaryHref: "/contact" },
      features: { title: "", copy: "" },
      faqs: { question: "", answer: "" },
      bottomItems: { title: "", text: "", image: "", cta: "Book Now", href: "/book", sortOrder: (settings.homepage.bottomItems || []).length + 1, isActive: true },
    }[key];
    update("homepage", key, [...(settings.homepage[key] || []), blank]);
  }

  function removeHomepageItem(key: "heroSlides" | "features" | "faqs" | "bottomItems", index: number) {
    if (!settings) return;
    update("homepage", key, (settings.homepage[key] || []).filter((_: unknown, itemIndex: number) => itemIndex !== index));
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
        <div className="grid gap-3 lg:grid-cols-2">
          {["name", "shortName", "email", "phone", "whatsapp", "website", "gst", "logoUrl", "workingHours", "mapEmbedUrl", "instagramUrl", "facebookUrl", "copyrightText"].map((key) => (
            <Input key={key} placeholder={key} value={settings.business[key] || ""} onChange={(e) => update("business", key, e.target.value)} />
          ))}
          <textarea className="min-h-24 rounded-lg border p-3 text-sm md:col-span-2" placeholder="Address" value={settings.business.address || ""} onChange={(e) => update("business", "address", e.target.value)} />
        </div>
        <Button className="mt-4" onClick={() => save("business")} disabled={saving === "business"}>{saving === "business" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Business</Button>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">Homepage Content</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage homepage banners, contact CTA, highlights, features, and FAQs.</p>
          </div>
          <Button onClick={() => save("homepage")} disabled={saving === "homepage"}>
            {saving === "homepage" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Homepage
          </Button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <Input placeholder="Hero eyebrow" value={settings.homepage.heroEyebrow || ""} onChange={(e) => update("homepage", "heroEyebrow", e.target.value)} />
          <Input placeholder="Features eyebrow" value={settings.homepage.featuresEyebrow || ""} onChange={(e) => update("homepage", "featuresEyebrow", e.target.value)} />
          <Input placeholder="Features title" value={settings.homepage.featuresTitle || ""} onChange={(e) => update("homepage", "featuresTitle", e.target.value)} className="lg:col-span-2" />
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Banner Slides</h3>
            <Button size="sm" variant="outline" onClick={() => addHomepageItem("heroSlides")}><Plus className="mr-2 h-4 w-4" /> Add Slide</Button>
          </div>
          {(settings.homepage.heroSlides || []).map((slide: HomepageSlide, index: number) => (
            <div key={index} className="rounded-lg border bg-[var(--surface)] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Slide {index + 1}</p>
                <Button size="sm" variant="destructive" onClick={() => removeHomepageItem("heroSlides", index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <Input placeholder="Title" value={slide.title || ""} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "title", e.target.value)} />
                <Input placeholder="Subtitle" value={slide.subtitle || ""} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "subtitle", e.target.value)} />
                <Input placeholder="Desktop image URL" value={slide.image || ""} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "image", e.target.value)} />
                <Input placeholder="Mobile image URL" value={slide.mobileImage || ""} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "mobileImage", e.target.value)} />
                <Input placeholder="Primary CTA text" value={slide.cta || ""} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "cta", e.target.value)} />
                <Input placeholder="Primary CTA link" value={slide.href || ""} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "href", e.target.value)} />
                <Input placeholder="Secondary CTA text" value={slide.secondary || ""} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "secondary", e.target.value)} />
                <Input placeholder="Secondary CTA link" value={slide.secondaryHref || ""} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "secondaryHref", e.target.value)} />
                <Input placeholder="Overlay opacity 0-100" inputMode="numeric" value={String(slide.overlayOpacity ?? 68)} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "overlayOpacity", Number(e.target.value.replace(/\D/g, "").slice(0, 3)))} />
                <Input placeholder="Sort order" inputMode="numeric" value={String(slide.sortOrder ?? index + 1)} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "sortOrder", Number(e.target.value.replace(/\D/g, "")))} />
                <select value={slide.textPosition || "left"} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "textPosition", e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
                  <option value="left">Text left</option>
                  <option value="center">Text center</option>
                  <option value="right">Text right</option>
                </select>
                <label className="flex h-11 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium">
                  <input type="checkbox" checked={slide.isActive !== false} onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "isActive", e.target.checked)} />
                  Active slide
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Featured Visit Block</h3>
            <div className="grid gap-3">
              <Input placeholder="Eyebrow" value={settings.homepage.eventEyebrow || ""} onChange={(e) => update("homepage", "eventEyebrow", e.target.value)} />
              <Input placeholder="Title" value={settings.homepage.eventTitle || ""} onChange={(e) => update("homepage", "eventTitle", e.target.value)} />
              <textarea className="min-h-24 rounded-lg border p-3 text-sm" placeholder="Copy" value={settings.homepage.eventCopy || ""} onChange={(e) => update("homepage", "eventCopy", e.target.value)} />
              <Input placeholder="Event date" value={settings.homepage.eventDate || ""} onChange={(e) => update("homepage", "eventDate", e.target.value)} />
              <Input placeholder="Image URL" value={settings.homepage.eventImage || ""} onChange={(e) => update("homepage", "eventImage", e.target.value)} />
              <Input placeholder="CTA label" value={settings.homepage.eventCta || ""} onChange={(e) => update("homepage", "eventCta", e.target.value)} />
              <Input placeholder="CTA link" value={settings.homepage.eventHref || ""} onChange={(e) => update("homepage", "eventHref", e.target.value)} />
              <label className="flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium">
                <input type="checkbox" checked={settings.homepage.eventActive !== false} onChange={(e) => update("homepage", "eventActive", e.target.checked)} />
                Show event section
              </label>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">About Block</h3>
            <div className="grid gap-3">
              <Input placeholder="Eyebrow" value={settings.homepage.aboutEyebrow || ""} onChange={(e) => update("homepage", "aboutEyebrow", e.target.value)} />
              <Input placeholder="Title" value={settings.homepage.aboutTitle || ""} onChange={(e) => update("homepage", "aboutTitle", e.target.value)} />
              <textarea className="min-h-24 rounded-lg border p-3 text-sm" placeholder="Copy" value={settings.homepage.aboutCopy || ""} onChange={(e) => update("homepage", "aboutCopy", e.target.value)} />
              <Input placeholder="Image URL" value={settings.homepage.aboutImage || ""} onChange={(e) => update("homepage", "aboutImage", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Feature Cards</h3>
            <Button size="sm" variant="outline" onClick={() => addHomepageItem("features")}><Plus className="mr-2 h-4 w-4" /> Add Feature</Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {(settings.homepage.features || []).map((feature: HomepageFeature, index: number) => (
              <div key={index} className="rounded-lg border bg-[var(--surface)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Feature {index + 1}</p>
                  <Button size="sm" variant="destructive" onClick={() => removeHomepageItem("features", index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="grid gap-3">
                  <Input placeholder="Title" value={feature.title || ""} onChange={(e) => updateHomepageArray<HomepageFeature>("features", index, "title", e.target.value)} />
                  <textarea className="min-h-20 rounded-lg border p-3 text-sm" placeholder="Copy" value={feature.copy || ""} onChange={(e) => updateHomepageArray<HomepageFeature>("features", index, "copy", e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">Bottom Carousel</h3>
              <Button size="sm" variant="outline" onClick={() => addHomepageItem("bottomItems")}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
            </div>
            <div className="space-y-3">
              {(settings.homepage.bottomItems || []).map((item: HomepageCarouselItem, index: number) => (
                <div key={index} className="rounded-lg border bg-[var(--surface)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Carousel item {index + 1}</p>
                    <Button size="sm" variant="destructive" onClick={() => removeHomepageItem("bottomItems", index)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="grid gap-2">
                    <Input placeholder="Title" value={item.title || ""} onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "title", e.target.value)} />
                    <Input placeholder="Short text" value={item.text || ""} onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "text", e.target.value)} />
                    <Input placeholder="Image URL" value={item.image || ""} onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "image", e.target.value)} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input placeholder="CTA label" value={item.cta || ""} onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "cta", e.target.value)} />
                      <Input placeholder="CTA link" value={item.href || ""} onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "href", e.target.value)} />
                      <Input placeholder="Sort order" inputMode="numeric" value={String(item.sortOrder ?? index + 1)} onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "sortOrder", Number(e.target.value.replace(/\D/g, "")))} />
                      <label className="flex h-11 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium">
                        <input type="checkbox" checked={item.isActive !== false} onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "isActive", e.target.checked)} />
                        Active
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Final Contact CTA</h3>
            <div className="grid gap-3">
              <Input placeholder="Eyebrow" value={settings.homepage.ctaEyebrow || ""} onChange={(e) => update("homepage", "ctaEyebrow", e.target.value)} />
              <Input placeholder="Title" value={settings.homepage.ctaTitle || ""} onChange={(e) => update("homepage", "ctaTitle", e.target.value)} />
              <p className="flex items-center gap-2 text-xs text-muted-foreground"><ImageIcon className="h-4 w-4" /> Contact details here come from Business Profile.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">FAQs</h3>
            <Button size="sm" variant="outline" onClick={() => addHomepageItem("faqs")}><Plus className="mr-2 h-4 w-4" /> Add FAQ</Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {(settings.homepage.faqs || []).map((faq: HomepageFaq, index: number) => (
              <div key={index} className="rounded-lg border bg-[var(--surface)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">FAQ {index + 1}</p>
                  <Button size="sm" variant="destructive" onClick={() => removeHomepageItem("faqs", index)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="grid gap-3">
                  <Input placeholder="Question" value={faq.question || ""} onChange={(e) => updateHomepageArray<HomepageFaq>("faqs", index, "question", e.target.value)} />
                  <textarea className="min-h-20 rounded-lg border p-3 text-sm" placeholder="Answer" value={faq.answer || ""} onChange={(e) => updateHomepageArray<HomepageFaq>("faqs", index, "answer", e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 font-bold">SMTP Settings</h2>
        <div className="grid gap-3 lg:grid-cols-2">
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
        <div className="grid gap-3 lg:grid-cols-2">
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
        <div className="grid gap-3 lg:grid-cols-2">
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
