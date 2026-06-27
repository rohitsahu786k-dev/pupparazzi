"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  ArrowUp,
  ArrowDown,
  Eye,
  Laptop,
  Smartphone,
  Check,
  Building2,
  LayoutGrid,
  Radio,
  SlidersHorizontal,
  X,
  PlusCircle,
  HelpCircle,
  MessageSquare
} from "lucide-react";
import type { HomepageCarouselItem, HomepageFaq, HomepageFeature, HomepageSlide } from "@/lib/homepage-content";
import Image from "next/image";

type SettingsState = {
  business: Record<string, any>;
  smtp: Record<string, any>;
  payment: Record<string, any>;
  homepage: Record<string, any>;
  whatsapp: Record<string, any>;
};

type TabId = "business" | "banners" | "homepage" | "integrations";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [saving, setSaving] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  
  // Navigation & preview state
  const [activeTab, setActiveTab] = useState<TabId>("business");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Show status alerts that auto-dismiss
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  function showNotification(text: string, type: "success" | "error" | "info" = "success") {
    setMessage(text);
    setMessageType(type);
  }

  function update(group: keyof SettingsState, key: string, value: any) {
    if (!settings) return;
    setSettings({ ...settings, [group]: { ...settings[group], [key]: value } });
  }

  function updateHomepageArray<T extends HomepageSlide | HomepageFeature | HomepageFaq | HomepageCarouselItem>(
    key: string,
    index: number,
    field: keyof T,
    value: any
  ) {
    if (!settings) return;
    const items = [...(settings.homepage[key] || [])];
    items[index] = { ...items[index], [field]: value };
    update("homepage", key, items);
  }

  function addHomepageItem(key: "heroSlides" | "features" | "faqs" | "bottomItems") {
    if (!settings) return;
    const blank = {
      heroSlides: {
        title: "",
        subtitle: "",
        image: "",
        mobileImage: "",
        overlayOpacity: 0,
        textPosition: "left",
        sortOrder: (settings.homepage.heroSlides || []).length + 1,
        isActive: true,
        cta: "Book Now",
        href: "/book",
        secondary: "Contact",
        secondaryHref: "/contact"
      },
      features: { title: "", copy: "" },
      faqs: { question: "", answer: "" },
      bottomItems: {
        title: "",
        text: "",
        image: "",
        cta: "Book Now",
        href: "/book",
        sortOrder: (settings.homepage.bottomItems || []).length + 1,
        isActive: true
      }
    }[key];
    update("homepage", key, [...(settings.homepage[key] || []), blank]);
    showNotification("Added item click Save to persist.", "info");
  }

  function removeHomepageItem(key: "heroSlides" | "features" | "faqs" | "bottomItems", index: number) {
    if (!settings) return;
    update("homepage", key, (settings.homepage[key] || []).filter((_: unknown, itemIndex: number) => itemIndex !== index));
    if (key === "heroSlides" && previewSlideIndex >= (settings.homepage.heroSlides || []).length - 1) {
      setPreviewSlideIndex(Math.max(0, (settings.homepage.heroSlides || []).length - 2));
    }
    showNotification("Removed item click Save to persist.", "info");
  }

  // Swap function for sorting
  function swapSlides(indexA: number, indexB: number) {
    if (!settings) return;
    const slides = [...(settings.homepage.heroSlides || [])];
    if (indexB < 0 || indexB >= slides.length) return;
    
    // Swap slides
    const temp = slides[indexA];
    slides[indexA] = slides[indexB];
    slides[indexB] = temp;
    
    // Update sortOrder
    const updated = slides.map((slide, idx) => ({
      ...slide,
      sortOrder: idx + 1
    }));
    
    update("homepage", "heroSlides", updated);
    setPreviewSlideIndex(indexB);
  }

  // HTML5 Drag and drop sorting
  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
  }

  function handleDrop(index: number) {
    if (draggedIndex === null || draggedIndex === index || !settings) return;
    const slides = [...(settings.homepage.heroSlides || [])];
    const draggedItem = slides[draggedIndex];
    
    slides.splice(draggedIndex, 1);
    slides.splice(index, 0, draggedItem);
    
    const updated = slides.map((slide, idx) => ({
      ...slide,
      sortOrder: idx + 1
    }));
    
    update("homepage", "heroSlides", updated);
    setPreviewSlideIndex(index);
    setDraggedIndex(null);
  }

  // Handle banner image upload
  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: "image" | "mobileImage"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.set("file", file);
    formData.set("category", "Hero");
    formData.set("folder", "banners");
    
    setSaving("upload");
    
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        updateHomepageArray<HomepageSlide>("heroSlides", index, field, data.path || data.url);
        showNotification("Banner image uploaded successfully!", "success");
      } else {
        const data = await res.json().catch(() => ({}));
        showNotification(data.error || "Upload failed", "error");
      }
    } catch (err) {
      showNotification("An error occurred during upload.", "error");
    } finally {
      setSaving("");
      if (e.target) e.target.value = "";
    }
  }

  async function save(group: keyof SettingsState) {
    if (!settings) return;
    setSaving(group);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: group, value: settings[group] }),
    });
    if (res.ok) {
      showNotification(`${group.charAt(0).toUpperCase() + group.slice(1)} settings saved successfully!`, "success");
    } else {
      showNotification("Unable to save settings", "error");
    }
    setSaving("");
  }

  async function sendTest() {
    setSaving("test");
    const res = await fetch("/api/admin/settings/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testEmail }),
    });
    if (res.ok) {
      showNotification("Test email sent!", "success");
    } else {
      showNotification("Test email failed", "error");
    }
    setSaving("");
  }

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { id: "business", name: "Business Profile", icon: Building2 },
    { id: "banners", name: "Banner Management", icon: SlidersHorizontal },
    { id: "homepage", name: "Homepage Sections", icon: LayoutGrid },
    { id: "integrations", name: "Integrations & APIs", icon: Radio },
  ] as const;

  const heroSlides = settings.homepage.heroSlides || [];

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Settings Control Panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure your brand assets, home presentation, and third-party API keys.</p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all shadow-sm flex items-center gap-2 animate-fade-in-up ${
            messageType === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : messageType === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          {messageType === "success" && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
          <span>{message}</span>
        </div>
      )}

      {/* Tabs Layout */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Navigation Sidebar */}
        <aside className="flex flex-row gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0 hide-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all whitespace-nowrap lg:w-full ${
                  isSelected
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-white hover:text-foreground border border-transparent hover:border-border"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.name}
              </button>
            );
          })}
        </aside>

        {/* Settings Body */}
        <main className="space-y-6">
          {/* TAB 1: BUSINESS PROFILE */}
          {activeTab === "business" && (
            <div className="space-y-6">
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b pb-4 mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Business Information</h2>
                    <p className="text-xs text-muted-foreground">Basic contact, address, and metadata details displayed on page headers and footers.</p>
                  </div>
                  <Button onClick={() => save("business")} disabled={saving === "business"}>
                    {saving === "business" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Profile
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Business Name</span>
                    <Input value={settings.business.name || ""} onChange={(e) => update("business", "name", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Short Name</span>
                    <Input value={settings.business.shortName || ""} onChange={(e) => update("business", "shortName", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Email Address</span>
                    <Input value={settings.business.email || ""} onChange={(e) => update("business", "email", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Primary Phone</span>
                    <Input value={settings.business.phone || ""} onChange={(e) => update("business", "phone", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>WhatsApp Contact</span>
                    <Input value={settings.business.whatsapp || ""} onChange={(e) => update("business", "whatsapp", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Website URL</span>
                    <Input value={settings.business.website || ""} onChange={(e) => update("business", "website", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>GST Number (Optional)</span>
                    <Input value={settings.business.gst || ""} onChange={(e) => update("business", "gst", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Logo Image URL</span>
                    <Input value={settings.business.logoUrl || ""} onChange={(e) => update("business", "logoUrl", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground md:col-span-2">
                    <span>Working Hours Summary</span>
                    <Input value={settings.business.workingHours || ""} onChange={(e) => update("business", "workingHours", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground md:col-span-2">
                    <span>Google Maps Embed Link (Src URL)</span>
                    <Input value={settings.business.mapEmbedUrl || ""} onChange={(e) => update("business", "mapEmbedUrl", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Instagram Profile Link</span>
                    <Input value={settings.business.instagramUrl || ""} onChange={(e) => update("business", "instagramUrl", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Facebook Profile Link</span>
                    <Input value={settings.business.facebookUrl || ""} onChange={(e) => update("business", "facebookUrl", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground md:col-span-2">
                    <span>Address Text</span>
                    <textarea
                      className="min-h-20 w-full rounded-xl border p-3 text-sm"
                      value={settings.business.address || ""}
                      onChange={(e) => update("business", "address", e.target.value)}
                    />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground md:col-span-2">
                    <span>Copyright Footer Text</span>
                    <Input value={settings.business.copyrightText || ""} onChange={(e) => update("business", "copyrightText", e.target.value)} />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BANNER CONTROL MODULE (Hero Carousel) */}
          {activeTab === "banners" && (
            <div className="space-y-6">
              {/* Device Preview block */}
              <div className="rounded-2xl border bg-slate-900 text-white p-6 shadow-xl space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Eye className="h-5 w-5 text-accent" /> Slider Device Mockup Preview
                    </h3>
                    <p className="text-xs text-white/60">Simulate how your sliders display dynamically based on user device viewports.</p>
                  </div>
                  <div className="flex gap-2 bg-white/10 p-1 rounded-xl w-fit">
                    <button
                      onClick={() => setPreviewMode("desktop")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
                        previewMode === "desktop" ? "bg-primary text-white" : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Laptop className="h-3.5 w-3.5" /> Desktop (16:6)
                    </button>
                    <button
                      onClick={() => setPreviewMode("mobile")}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition ${
                        previewMode === "mobile" ? "bg-primary text-white" : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" /> Mobile (4:5)
                    </button>
                  </div>
                </div>

                <div className="flex justify-center bg-black/40 p-4 rounded-xl border border-white/5">
                  {previewMode === "desktop" ? (
                    /* Laptop mockup aspect ratio */
                    <div className="w-full max-w-2xl aspect-[16/6] relative rounded-xl overflow-hidden border border-white/10 bg-slate-800 shadow-2xl">
                      {heroSlides.length > 0 ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={heroSlides[previewSlideIndex]?.image || "/images/banner_grooming_desktop.png"}
                            alt="Desktop Preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          
                          {/* Banner Info Callout Overlay */}
                          {heroSlides[previewSlideIndex]?.title && (
                            <div className="absolute bottom-4 left-4 z-10 max-w-[60%] rounded-xl bg-black/40 border border-white/10 p-3 text-white backdrop-blur-sm shadow-lg text-left">
                              <h4 className="text-xs font-bold text-white">{heroSlides[previewSlideIndex]?.title}</h4>
                              <p className="text-[10px] text-white/80 line-clamp-1 mt-0.5">{heroSlides[previewSlideIndex]?.subtitle}</p>
                            </div>
                          )}

                           {/* Controls in preview */}
                          <div className="absolute bottom-2 right-2 flex gap-1 z-10">
                            {heroSlides.map((slide: HomepageSlide, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => setPreviewSlideIndex(idx)}
                                className={`h-1.5 rounded-full transition-all ${idx === previewSlideIndex ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center text-white/30 text-xs font-semibold">No banners to preview</div>
                      )}
                    </div>
                  ) : (
                    /* Phone mockup ratio */
                    <div className="w-56 aspect-[4/5] relative rounded-2xl overflow-hidden border-4 border-slate-700 bg-slate-800 shadow-2xl">
                      {heroSlides.length > 0 ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={heroSlides[previewSlideIndex]?.mobileImage || heroSlides[previewSlideIndex]?.image || "/images/banner_grooming_mobile.png"}
                            alt="Mobile Preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          
                          {heroSlides[previewSlideIndex]?.title && (
                            <div className="absolute bottom-4 left-2 right-2 z-10 rounded-lg bg-black/45 border border-white/10 p-2 text-white backdrop-blur-sm text-center">
                              <h4 className="text-[10px] font-bold leading-tight">{heroSlides[previewSlideIndex]?.title}</h4>
                            </div>
                          )}

                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                            {heroSlides.map((slide: HomepageSlide, idx: number) => (
                              <button
                                key={idx}
                                onClick={() => setPreviewSlideIndex(idx)}
                                className={`h-1.5 rounded-full transition-all ${idx === previewSlideIndex ? "w-3 bg-white" : "w-1 bg-white/40"}`}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center text-white/30 text-xs font-semibold">No banners to preview</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Banners List */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Manage Hero Banners</h2>
                    <p className="text-xs text-muted-foreground">Upload graphic banners, set destination links, and toggle display states. Reorder using drag-and-drop or arrow buttons.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addHomepageItem("heroSlides")}>
                      <Plus className="mr-1.5 h-4 w-4" /> Add Slide
                    </Button>
                    <Button onClick={() => save("homepage")} disabled={saving === "homepage"}>
                      {saving === "homepage" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Carousel
                    </Button>
                  </div>
                </div>

                {heroSlides.length === 0 ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 text-center text-muted-foreground bg-[var(--surface)]">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/50 mb-2" />
                    <p className="text-sm font-bold">No Banners Configured</p>
                    <p className="text-xs max-w-xs mt-1">Create a new banner slide using the add button to begin showcasing pet care highlights.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {heroSlides.map((slide: HomepageSlide, index: number) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={() => handleDrop(index)}
                        className={`group relative rounded-2xl border border-border p-5 bg-white transition-all hover:shadow-md cursor-grab active:cursor-grabbing ${
                          draggedIndex === index ? "opacity-45 bg-[var(--surface)]" : ""
                        }`}
                      >
                        <div className="absolute top-4 left-4 flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {index + 1}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
                            Sort: {slide.sortOrder ?? index + 1}
                          </span>
                        </div>

                        <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => swapSlides(index, index - 1)}
                            disabled={index === 0}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-white"
                            title="Move Up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => swapSlides(index, index + 1)}
                            disabled={index === heroSlides.length - 1}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:hover:bg-white"
                            title="Move Down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewSlideIndex(index);
                              setActiveTab("banners");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-muted-foreground hover:text-primary hover:bg-primary/5"
                            title="Preview Slide"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeHomepageItem("heroSlides", index)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500"
                            title="Delete Slide"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-8 grid gap-4 lg:grid-cols-3">
                          {/* Banner Images configuration */}
                          <div className="space-y-4 lg:col-span-1 border-r pr-0 lg:pr-5 border-border/60">
                            {/* Desktop Image upload */}
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold text-muted-foreground block">Desktop Banner Image</span>
                              <div className="relative aspect-[16/7] w-full rounded-xl overflow-hidden border bg-[var(--surface)] flex items-center justify-center group/img">
                                {slide.image ? (
                                  <>
                                    <Image src={slide.image} alt="Desktop image" fill className="object-cover" unoptimized />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                      <button
                                        type="button"
                                        className="text-xs font-bold text-white bg-black/60 px-3 py-1.5 rounded-lg border border-white/20 hover:bg-black"
                                        onClick={() => document.getElementById(`file-desk-${index}`)?.click()}
                                      >
                                        Replace Desktop Image
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-center p-3 text-muted-foreground">
                                    <ImageIcon className="mx-auto h-8 w-8 opacity-45 mb-1" />
                                    <span className="text-[10px] font-semibold">No desktop image</span>
                                  </div>
                                )}
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                id={`file-desk-${index}`}
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, index, "image")}
                              />
                              <Input
                                placeholder="Desktop Image URL"
                                value={slide.image || ""}
                                onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "image", e.target.value)}
                                className="text-xs h-9 mt-1"
                              />
                            </div>

                            {/* Mobile Image upload */}
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold text-muted-foreground block">Mobile Banner Image</span>
                              <div className="relative aspect-[4/5] w-28 mx-auto rounded-xl overflow-hidden border bg-[var(--surface)] flex items-center justify-center group/img">
                                {slide.mobileImage || slide.image ? (
                                  <>
                                    <Image src={slide.mobileImage || slide.image} alt="Mobile image" fill className="object-cover" unoptimized />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                      <button
                                        type="button"
                                        className="text-[10px] font-bold text-white bg-black/60 px-2 py-1 rounded-lg border border-white/20 hover:bg-black"
                                        onClick={() => document.getElementById(`file-mob-${index}`)?.click()}
                                      >
                                        Replace Mobile Image
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-center p-3 text-muted-foreground">
                                    <ImageIcon className="mx-auto h-6 w-6 opacity-45 mb-1" />
                                    <span className="text-[9px] font-semibold">No mobile image</span>
                                  </div>
                                )}
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                id={`file-mob-${index}`}
                                className="hidden"
                                onChange={(e) => handleImageUpload(e, index, "mobileImage")}
                              />
                              <Input
                                placeholder="Mobile Image URL (portrait recommended)"
                                value={slide.mobileImage || ""}
                                onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "mobileImage", e.target.value)}
                                className="text-xs h-9 mt-1"
                              />
                            </div>
                          </div>

                          {/* Info Fields */}
                          <div className="lg:col-span-2 space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="space-y-1 text-xs font-bold text-muted-foreground">
                                <span>Banner Title (Optional overlay)</span>
                                <Input
                                  placeholder="e.g. Grooming & Spa Treatments"
                                  value={slide.title || ""}
                                  onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "title", e.target.value)}
                                />
                              </label>
                              <label className="space-y-1 text-xs font-bold text-muted-foreground">
                                <span>Subtitle / Caption (Optional)</span>
                                <Input
                                  placeholder="e.g. Pamper your pet today."
                                  value={slide.subtitle || ""}
                                  onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "subtitle", e.target.value)}
                                />
                              </label>
                              <label className="space-y-1 text-xs font-bold text-muted-foreground">
                                <span>Clickable URL Destination link</span>
                                <Input
                                  placeholder="/book?service=grooming"
                                  value={slide.href || ""}
                                  onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "href", e.target.value)}
                                />
                              </label>
                              <label className="space-y-1 text-xs font-bold text-muted-foreground">
                                <span>CTA Button Label</span>
                                <Input
                                  placeholder="e.g. Book Grooming"
                                  value={slide.cta || ""}
                                  onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "cta", e.target.value)}
                                />
                              </label>
                              <label className="space-y-1 text-xs font-bold text-muted-foreground">
                                <span>Overlay Screen Opacity (0-100%)</span>
                                <Input
                                  inputMode="numeric"
                                  placeholder="0 for graphic banners"
                                  value={String(slide.overlayOpacity ?? 0)}
                                  onChange={(e) =>
                                    updateHomepageArray<HomepageSlide>(
                                      "heroSlides",
                                      index,
                                      "overlayOpacity",
                                      Number(e.target.value.replace(/\D/g, "").slice(0, 3))
                                    )
                                  }
                                />
                              </label>
                              <div className="flex flex-col gap-3 justify-end pb-1.5">
                                <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={slide.isActive !== false}
                                    onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "isActive", e.target.checked)}
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                  />
                                  <span>Enable / Display this banner banner</span>
                                </label>
                              </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 border-t pt-4">
                              <label className="space-y-1 text-xs font-bold text-muted-foreground">
                                <span>Secondary CTA Label (Optional overlay)</span>
                                <Input
                                  placeholder="e.g. Read reviews"
                                  value={slide.secondary || ""}
                                  onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "secondary", e.target.value)}
                                />
                              </label>
                              <label className="space-y-1 text-xs font-bold text-muted-foreground">
                                <span>Secondary CTA Link</span>
                                <Input
                                  placeholder="e.g. /reviews"
                                  value={slide.secondaryHref || ""}
                                  onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "secondaryHref", e.target.value)}
                                />
                              </label>
                              <label className="space-y-1 text-xs font-bold text-muted-foreground">
                                <span>Overlay Text Position</span>
                                <select
                                  value={slide.textPosition || "left"}
                                  onChange={(e) => updateHomepageArray<HomepageSlide>("heroSlides", index, "textPosition", e.target.value as any)}
                                  className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"
                                >
                                  <option value="left">Text Align Left</option>
                                  <option value="center">Text Align Center</option>
                                  <option value="right">Text Align Right</option>
                                </select>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: HOMEPAGE SECTIONS CONTENT */}
          {activeTab === "homepage" && (
            <div className="space-y-6">
              <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Section Headers & Core Copy</h2>
                    <p className="text-xs text-muted-foreground">Control headers, highlight features, faqs, and the bottom info cards.</p>
                  </div>
                  <Button onClick={() => save("homepage")} disabled={saving === "homepage"}>
                    {saving === "homepage" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Sections
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Hero Eyebrow tag</span>
                    <Input value={settings.homepage.heroEyebrow || ""} onChange={(e) => update("homepage", "heroEyebrow", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Features Section Eyebrow</span>
                    <Input value={settings.homepage.featuresEyebrow || ""} onChange={(e) => update("homepage", "featuresEyebrow", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground md:col-span-2">
                    <span>Features Section Main Title</span>
                    <Input value={settings.homepage.featuresTitle || ""} onChange={(e) => update("homepage", "featuresTitle", e.target.value)} />
                  </label>
                </div>

                {/* Featured Visit Block */}
                <div className="border-t pt-5 mt-5 space-y-4">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <PlusCircle className="h-4 w-4 text-primary" /> Featured Visit Event block
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-bold text-muted-foreground">
                      <span>Event Eyebrow Label</span>
                      <Input value={settings.homepage.eventEyebrow || ""} onChange={(e) => update("homepage", "eventEyebrow", e.target.value)} />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-muted-foreground">
                      <span>Event Title</span>
                      <Input value={settings.homepage.eventTitle || ""} onChange={(e) => update("homepage", "eventTitle", e.target.value)} />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-muted-foreground">
                      <span>Event Timing / Date text</span>
                      <Input value={settings.homepage.eventDate || ""} onChange={(e) => update("homepage", "eventDate", e.target.value)} />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-muted-foreground">
                      <span>Event Feature Image URL</span>
                      <Input value={settings.homepage.eventImage || ""} onChange={(e) => update("homepage", "eventImage", e.target.value)} />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-muted-foreground">
                      <span>CTA Button Label</span>
                      <Input value={settings.homepage.eventCta || ""} onChange={(e) => update("homepage", "eventCta", e.target.value)} />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-muted-foreground">
                      <span>CTA Button URL Destination Link</span>
                      <Input value={settings.homepage.eventHref || ""} onChange={(e) => update("homepage", "eventHref", e.target.value)} />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-muted-foreground sm:col-span-2">
                      <span>Event Copy / Description Paragraph</span>
                      <textarea
                        className="min-h-20 w-full rounded-xl border p-3 text-sm"
                        value={settings.homepage.eventCopy || ""}
                        onChange={(e) => update("homepage", "eventCopy", e.target.value)}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={settings.homepage.eventActive !== false}
                        onChange={(e) => update("homepage", "eventActive", e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>Show this event block on homepage</span>
                    </label>
                  </div>
                </div>

                {/* About Block */}
                <div className="border-t pt-5 mt-5 space-y-4">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <PlusCircle className="h-4 w-4 text-primary" /> About Section
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-bold text-muted-foreground">
                      <span>About Eyebrow</span>
                      <Input value={settings.homepage.aboutEyebrow || ""} onChange={(e) => update("homepage", "aboutEyebrow", e.target.value)} />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-muted-foreground">
                      <span>About Title</span>
                      <Input value={settings.homepage.aboutTitle || ""} onChange={(e) => update("homepage", "aboutTitle", e.target.value)} />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-muted-foreground sm:col-span-2">
                      <span>About Image URL</span>
                      <Input value={settings.homepage.aboutImage || ""} onChange={(e) => update("homepage", "aboutImage", e.target.value)} />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-muted-foreground sm:col-span-2">
                      <span>About Copy / Paragraph</span>
                      <textarea
                        className="min-h-20 w-full rounded-xl border p-3 text-sm"
                        value={settings.homepage.aboutCopy || ""}
                        onChange={(e) => update("homepage", "aboutCopy", e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                {/* Feature highlights Cards list */}
                <div className="border-t pt-5 mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground">Highlights Feature Cards</h3>
                    <Button size="sm" variant="outline" onClick={() => addHomepageItem("features")}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Highlight
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(settings.homepage.features || []).map((feature: HomepageFeature, index: number) => (
                      <div key={index} className="rounded-xl border p-4 bg-[var(--surface)] relative group">
                        <button
                          type="button"
                          onClick={() => removeHomepageItem("features", index)}
                          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg border bg-white text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="space-y-2">
                          <label className="space-y-1 text-[10px] font-bold text-muted-foreground block">
                            <span>Card Title</span>
                            <Input
                              value={feature.title || ""}
                              onChange={(e) => updateHomepageArray<HomepageFeature>("features", index, "title", e.target.value)}
                              className="bg-white"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold text-muted-foreground block">
                            <span>Card Copy</span>
                            <textarea
                              className="min-h-16 w-full rounded-xl border border-input bg-white p-2.5 text-xs font-medium"
                              value={feature.copy || ""}
                              onChange={(e) => updateHomepageArray<HomepageFeature>("features", index, "copy", e.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Carousel Highlights */}
                <div className="border-t pt-5 mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground">Highlights Carousel (Bottom)</h3>
                    <Button size="sm" variant="outline" onClick={() => addHomepageItem("bottomItems")}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Bottom Slide
                    </Button>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {(settings.homepage.bottomItems || []).map((item: HomepageCarouselItem, index: number) => (
                      <div key={index} className="rounded-xl border p-4 bg-[var(--surface)] relative group">
                        <button
                          type="button"
                          onClick={() => removeHomepageItem("bottomItems", index)}
                          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg border bg-white text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1 text-[10px] font-bold text-muted-foreground">
                            <span>Title</span>
                            <Input
                              value={item.title || ""}
                              onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "title", e.target.value)}
                              className="bg-white"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold text-muted-foreground">
                            <span>Short Text</span>
                            <Input
                              value={item.text || ""}
                              onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "text", e.target.value)}
                              className="bg-white"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold text-muted-foreground">
                            <span>Image URL</span>
                            <Input
                              value={item.image || ""}
                              onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "image", e.target.value)}
                              className="bg-white"
                            />
                          </label>
                          <div className="grid gap-2 grid-cols-2">
                            <label className="space-y-1 text-[10px] font-bold text-muted-foreground">
                              <span>CTA Button</span>
                              <Input
                                value={item.cta || ""}
                                onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "cta", e.target.value)}
                                className="bg-white"
                              />
                            </label>
                            <label className="space-y-1 text-[10px] font-bold text-muted-foreground">
                              <span>CTA link URL</span>
                              <Input
                                value={item.href || ""}
                                onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "href", e.target.value)}
                                className="bg-white"
                              />
                            </label>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="space-y-1 text-[10px] font-bold text-muted-foreground block flex-1">
                              <span>Display Order</span>
                              <Input
                                inputMode="numeric"
                                value={String(item.sortOrder ?? index + 1)}
                                onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "sortOrder", Number(e.target.value.replace(/\D/g, "")))}
                                className="bg-white"
                              />
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground cursor-pointer select-none mt-4">
                              <input
                                type="checkbox"
                                checked={item.isActive !== false}
                                onChange={(e) => updateHomepageArray<HomepageCarouselItem>("bottomItems", index, "isActive", e.target.checked)}
                                className="h-4.5 w-4.5 rounded text-primary focus:ring-primary"
                              />
                              <span>Active</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Contact Call to Action */}
                <div className="border-t pt-5 mt-5 space-y-4">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                    <PlusCircle className="h-4 w-4 text-primary" /> Bottom Contact Banner CTA
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-bold text-muted-foreground">
                      <span>CTA Eyebrow tag</span>
                      <Input value={settings.homepage.ctaEyebrow || ""} onChange={(e) => update("homepage", "ctaEyebrow", e.target.value)} />
                    </label>
                    <label className="space-y-1 text-xs font-bold text-muted-foreground">
                      <span>CTA Headline title</span>
                      <Input value={settings.homepage.ctaTitle || ""} onChange={(e) => update("homepage", "ctaTitle", e.target.value)} />
                    </label>
                  </div>
                </div>

                {/* FAQs */}
                <div className="border-t pt-5 mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                      <HelpCircle className="h-4.5 w-4.5 text-primary" /> FAQ List Items
                    </h3>
                    <Button size="sm" variant="outline" onClick={() => addHomepageItem("faqs")}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add FAQ
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(settings.homepage.faqs || []).map((faq: HomepageFaq, index: number) => (
                      <div key={index} className="rounded-xl border p-4 bg-[var(--surface)] relative group">
                        <button
                          type="button"
                          onClick={() => removeHomepageItem("faqs", index)}
                          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg border bg-white text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="space-y-2">
                          <label className="space-y-1 text-[10px] font-bold text-muted-foreground block">
                            <span>FAQ Question</span>
                            <Input
                              value={faq.question || ""}
                              onChange={(e) => updateHomepageArray<HomepageFaq>("faqs", index, "question", e.target.value)}
                              className="bg-white"
                            />
                          </label>
                          <label className="space-y-1 text-[10px] font-bold text-muted-foreground block">
                            <span>FAQ Answer</span>
                            <textarea
                              className="min-h-16 w-full rounded-xl border border-input bg-white p-2.5 text-xs font-medium"
                              value={faq.answer || ""}
                              onChange={(e) => updateHomepageArray<HomepageFaq>("faqs", index, "answer", e.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INTEGRATIONS (SMTP, Payment Gateway, WhatsApp Templates) */}
          {activeTab === "integrations" && (
            <div className="space-y-6">
              {/* SMTP Settings */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">SMTP Mail Server</h2>
                    <p className="text-xs text-muted-foreground">Setup email servers to send booking confirmation alerts and customer messages.</p>
                  </div>
                  <Button onClick={() => save("smtp")} disabled={saving === "smtp"}>
                    {saving === "smtp" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save SMTP
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Host name</span>
                    <Input placeholder="smtp.gmail.com" value={settings.smtp.host || ""} onChange={(e) => update("smtp", "host", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Port number</span>
                    <Input type="number" placeholder="465" value={settings.smtp.port || ""} onChange={(e) => update("smtp", "port", Number(e.target.value))} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>SMTP Authentication User</span>
                    <Input placeholder="user@gmail.com" value={settings.smtp.user || ""} onChange={(e) => update("smtp", "user", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>SMTP Password</span>
                    <Input type="password" placeholder="••••••••" value={settings.smtp.pass || ""} onChange={(e) => update("smtp", "pass", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Sender Friendly Display Name</span>
                    <Input placeholder="Pupparazzi Club" value={settings.smtp.fromName || ""} onChange={(e) => update("smtp", "fromName", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Sender Email Address</span>
                    <Input placeholder="alerts@pupparazziclub.in" value={settings.smtp.fromEmail || ""} onChange={(e) => update("smtp", "fromEmail", e.target.value)} />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.smtp.secure)}
                      onChange={(e) => update("smtp", "secure", e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Force Secure SSL/TLS SMTP connection</span>
                  </label>
                </div>

                <div className="flex gap-2 items-end border-t pt-4 mt-4">
                  <label className="space-y-1 text-xs font-bold text-muted-foreground flex-1 max-w-xs">
                    <span>Send test email to address</span>
                    <Input placeholder="test@gmail.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                  </label>
                  <Button variant="outline" onClick={sendTest} disabled={!testEmail || saving === "test"}>
                    {saving === "test" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
                    Send Test Mail
                  </Button>
                </div>
              </div>

              {/* Payment Gateway */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Online Payment Gateway</h2>
                    <p className="text-xs text-muted-foreground">Configure online gateway settings and checkout currencies.</p>
                  </div>
                  <Button onClick={() => save("payment")} disabled={saving === "payment"}>
                    {saving === "payment" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Payment Keys
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Payment provider option</span>
                    <select
                      value={settings.payment.provider || "manual"}
                      onChange={(e) => update("payment", "provider", e.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"
                    >
                      <option value="manual">Cash / Manual Offline Settlements</option>
                      <option value="razorpay">Razorpay Merchant Gateway</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Currency symbol code</span>
                    <Input placeholder="INR" value={settings.payment.currency || "INR"} onChange={(e) => update("payment", "currency", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Razorpay API Public Key ID</span>
                    <Input placeholder="rzp_live_..." value={settings.payment.razorpayKeyId || ""} onChange={(e) => update("payment", "razorpayKeyId", e.target.value)} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-muted-foreground">
                    <span>Razorpay API Secret Key</span>
                    <Input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={settings.payment.razorpayKeySecret || ""}
                      onChange={(e) => update("payment", "razorpayKeySecret", e.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.payment.enabled)}
                      onChange={(e) => update("payment", "enabled", e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Accept online booking payments instantly</span>
                  </label>
                </div>
              </div>

              {/* WhatsApp Notification Custom Templates */}
              <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">WhatsApp Custom Templates</h2>
                    <p className="text-xs text-muted-foreground">Configure templates for WhatsApp click actions. Variable tokens: {"{{customerName}}"}, {"{{bookingId}}"}, {"{{serviceName}}"}, {"{{advanceAmount}}"}, {"{{remainingAmount}}"}.</p>
                  </div>
                  <Button onClick={() => save("whatsapp")} disabled={saving === "whatsapp"}>
                    {saving === "whatsapp" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save WhatsApp Templates
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { key: "bookingConfirmation", label: "Booking Confirmation" },
                    { key: "paymentSuccess", label: "Successful Payment Received" },
                    { key: "codAdvancePaid", label: "COD Booking Advance Paid Alert" },
                    { key: "codReminder", label: "COD Remaining Balance Reminder Alert" },
                    { key: "cancellation", label: "Booking Cancellation Notice" }
                  ].map((item) => (
                    <label key={item.key} className="space-y-1 text-xs font-bold text-muted-foreground">
                      <span>{item.label} Template Copy</span>
                      <textarea
                        className="min-h-24 w-full rounded-xl border p-3 text-sm font-medium"
                        value={settings.whatsapp[item.key] || ""}
                        onChange={(e) => update("whatsapp", item.key, e.target.value)}
                      />
                    </label>
                  ))}
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.whatsapp.enabled)}
                        onChange={(e) => update("whatsapp", "enabled", e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>Activate WhatsApp message sharing interface on dashboard</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
