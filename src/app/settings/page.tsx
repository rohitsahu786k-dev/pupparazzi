"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2, MapPin, Navigation, UserCog } from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir",
  "Ladakh","Puducherry","Chandigarh","Dadra & Nagar Haveli","Daman & Diu",
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id;

  const [addr, setAddr] = useState({ line1: "", city: "", state: "", pincode: "", phone: "" });
  const [fetchingAddr, setFetchingAddr] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}/address`)
      .then(r => r.json())
      .then(d => {
        if (d && d.line1) {
          setAddr({
            line1: d.line1 || "",
            city: d.city || "",
            state: d.state || "",
            pincode: d.pincode || "",
            phone: d.phone || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setFetchingAddr(false));
  }, [userId]);

  async function detectLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Your browser does not support location detection. Please enter address manually.");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/location/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Unable to detect address");
          setAddr(prev => ({
            ...prev,
            line1: data.line1 || prev.line1,
            city:  data.city || prev.city,
            state: data.state || prev.state,
            pincode: data.pincode || prev.pincode,
          }));
          if (!data.pincode) setError("Location detected, but pincode was not found. Please enter pincode manually.");
        } catch {
          setError("Could not fetch address from your location. Please enter it manually.");
        }
        setDetecting(false);
      },
      async (geoError) => {
        try {
          const res = await fetch("/api/location/ip");
          const data = await res.json();
          setAddr(prev => ({
            ...prev,
            city: data.city || prev.city,
            state: data.state || prev.state,
            pincode: data.pincode || prev.pincode,
          }));
        } catch {}
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location permission was denied. Please allow location access or enter address manually."
            : "Could not detect exact location. Please enter address manually."
        );
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 600000 }
    );
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setError(""); setSaved(false); setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/address`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addr),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.message || "Failed to save");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSaving(false);
  }

  if (status === "loading" || fetchingAddr) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">Settings</h1>
          <p className="text-secondary mt-1">Manage your account preferences and saved location.</p>
        </div>

        {/* Account info (read-only) */}
        <Card className="rounded-[10px] border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[10px] border border-border p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-secondary font-medium">Name</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{session?.user?.name || "Not set"}</p>
              </div>
            </div>
            <div className="rounded-[10px] border border-border p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-secondary font-medium">Email</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{session?.user?.email || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location / Address */}
        <Card className="rounded-[10px] border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Saved Location
            </CardTitle>
            <button
              type="button"
              onClick={detectLocation}
              disabled={detecting}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {detecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
              {detecting ? "Detecting…" : "Detect My Location"}
            </button>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveAddress} className="space-y-3">
              <Input
                placeholder="Address line (house no, street, area)"
                value={addr.line1}
                onChange={e => setAddr({ ...addr, line1: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="City"
                  value={addr.city}
                  onChange={e => setAddr({ ...addr, city: e.target.value })}
                  required
                />
                <Input
                  placeholder="Pincode"
                  value={addr.pincode}
                  maxLength={6}
                  onChange={e => setAddr({ ...addr, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  required
                />
              </div>
              <select
                value={addr.state}
                onChange={e => setAddr({ ...addr, state: e.target.value })}
                className="w-full h-10 border border-input rounded-[10px] px-3 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
              <Input
                placeholder="Phone number (optional)"
                value={addr.phone}
                onChange={e => setAddr({ ...addr, phone: e.target.value })}
              />

              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}

              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Save Location"}
                </Button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> Saved!
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/profile">Go to Profile</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
