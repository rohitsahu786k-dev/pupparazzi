"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CalendarPlus, Loader2 } from "lucide-react";

type User = { id: string; name?: string | null; email?: string | null; phone?: string | null; pets: { id: string; name: string; type: string }[] };
type Service = { id: string; name: string; category: string; price: number; discounted_price?: number | null; slot_duration_mins: number };

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function NewAdminBookingPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientId, setClientId] = useState("");
  const [petId, setPetId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [slotDate, setSlotDate] = useState(new Date().toISOString().slice(0, 10));
  const [slotTime, setSlotTime] = useState("10:00 AM");
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState({ line1: "", city: "", state: "Gujarat", pincode: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedUser = users.find((user) => user.id === clientId);
  const selectedService = services.find((service) => service.id === serviceId);
  const pets = selectedUser?.pets || [];

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users?role=CLIENT").then((res) => res.json()),
      fetch("/api/services").then((res) => res.json()),
    ]).then(([userData, serviceData]) => {
      const nextUsers = Array.isArray(userData) ? userData : [];
      const nextServices = Array.isArray(serviceData) ? serviceData : [];
      setUsers(nextUsers);
      setServices(nextServices);
      setClientId(nextUsers[0]?.id || "");
      setPetId(nextUsers[0]?.pets?.[0]?.id || "");
      setServiceId(nextServices[0]?.id || "");
    }).catch(() => setError("Unable to load booking data.")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPetId(pets[0]?.id || "");
  }, [clientId]);

  const summary = useMemo(() => {
    const price = Number(selectedService?.discounted_price || selectedService?.price || 0);
    return selectedService ? `${selectedService.name} · ${money(price)}` : "-";
  }, [selectedService]);

  async function createBooking() {
    setError("");
    if (!clientId || !petId || !serviceId || !slotDate || !slotTime) {
      setError("Client, pet, service, date and slot are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        pet_id: petId,
        service_id: serviceId,
        slot_date: slotDate,
        slot_time: slotTime,
        address: address.line1 && address.city && address.pincode ? address : undefined,
        notes: notes || "Created by admin",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.message || "Booking could not be created.");
      setSaving(false);
      return;
    }
    router.push("/admin/bookings");
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Booking</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a booking on behalf of a customer.</p>
        </div>
        <Button variant="outline" asChild><Link href="/admin/bookings"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4 rounded-lg border bg-white p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm font-bold">Customer
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm font-normal">
                {users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.phone || "Customer"}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm font-bold">Pet
              <select value={petId} onChange={(e) => setPetId(e.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm font-normal">
                {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} ({pet.type})</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm font-bold md:col-span-2">Service
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm font-normal">
                {services.map((service) => <option key={service.id} value={service.id}>{service.category} · {service.name}</option>)}
              </select>
            </label>
            <Input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
            <Input value={slotTime} onChange={(e) => setSlotTime(e.target.value)} placeholder="10:00 AM" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="House / society / area" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            <Input placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            <Input placeholder="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
            <Input placeholder="Pincode" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
            <Input placeholder="Phone" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal/customer notes" className="min-h-24 w-full rounded-lg border bg-white p-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </section>

        <aside className="rounded-lg border bg-foreground p-5 text-white">
          <h2 className="font-bold">Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-white/65">Customer</span><span className="text-right font-bold">{selectedUser?.name || selectedUser?.email || "-"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-white/65">Pet</span><span className="text-right font-bold">{pets.find((pet) => pet.id === petId)?.name || "-"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-white/65">Service</span><span className="text-right font-bold">{summary}</span></div>
            <div className="flex justify-between gap-3"><span className="text-white/65">Schedule</span><span className="text-right font-bold">{slotDate} · {slotTime}</span></div>
          </div>
          <Button className="mt-5 w-full bg-white text-foreground hover:bg-white/90" onClick={createBooking} disabled={saving || pets.length === 0}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarPlus className="mr-2 h-4 w-4" />}
            Create booking
          </Button>
          {pets.length === 0 && <p className="mt-3 text-xs text-white/70">This customer needs a pet profile before booking.</p>}
        </aside>
      </div>
    </div>
  );
}
