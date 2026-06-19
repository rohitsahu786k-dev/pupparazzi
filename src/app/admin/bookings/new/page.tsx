"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CalendarPlus, Loader2 } from "lucide-react";

type User = { id: string; name?: string | null; email?: string | null; phone?: string | null; pets: { id: string; name: string; type: string }[] };
type Service = { id: string; name: string; category: string; price: number; discounted_price?: number | null; slot_duration_mins: number };

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function priceOf(service?: Service | null) {
  return Number(service?.discounted_price || service?.price || 0);
}

function visibleEmail(value?: string | null) {
  if (!value || value.endsWith("@old-import.local") || value.endsWith("@client.local")) return "";
  return value;
}

function parseDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function boardingHours(schedule: BoardingSchedule) {
  const checkIn = parseDateTime(schedule.check_in_date, schedule.check_in_time);
  const checkOut = parseDateTime(schedule.check_out_date, schedule.check_out_time);
  if (!checkIn || !checkOut || checkOut <= checkIn) return null;
  return (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
}

function isBoardingPackage(service?: Service | null) {
  return Boolean(service?.name.toLowerCase().includes("package"));
}

function boardingSlabLabel(hours: number | null) {
  if (hours == null) return "";
  if (hours <= 6) return "Up to 6 Hours";
  if (hours <= 12) return "6 to 12 Hours";
  return "24 Hours / 1 Day";
}

type BoardingSchedule = {
  check_in_date: string;
  check_out_date: string;
  check_in_time: string;
  check_out_time: string;
  check_in_slot: string;
  check_out_slot: string;
};

export default function NewAdminBookingPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientId, setClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [petId, setPetId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [slotDate, setSlotDate] = useState(dateKey());
  const [slotTime, setSlotTime] = useState("10:00");
  const [boardingSchedule, setBoardingSchedule] = useState<BoardingSchedule>({
    check_in_date: dateKey(),
    check_out_date: "",
    check_in_time: "10:00",
    check_out_time: "",
    check_in_slot: "",
    check_out_slot: "",
  });
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState({ line1: "", city: "", state: "Gujarat", pincode: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [error, setError] = useState("");
  const [newClient, setNewClient] = useState({
    name: "",
    phone: "",
    email: "",
    pet_name: "",
    pet_type: "Dog",
    breed: "",
    gender: "",
    dob: "",
    weight: "",
    coat_type: "",
    size: "",
    dietary_preference: "",
    allergies: "",
    preferences: "",
    local_guardian_name: "",
    local_guardian_contact: "",
    walk_schedule_1: "",
    walk_schedule_2: "",
    walk_schedule_3: "",
    vaccination_status: "",
    vet_name: "",
    vet_contact: "",
    ongoing_medication: "No",
    medication_detail: "",
    illness_history: "",
  });

  const selectedUser = users.find((user) => user.id === clientId);
  const selectedService = services.find((service) => service.id === serviceId);
  const pets = useMemo(() => selectedUser?.pets || [], [selectedUser]);
  const isBoarding = selectedService?.category === "Boarding";
  const hours = useMemo(() => boardingHours(boardingSchedule), [boardingSchedule]);

  const calculatedAmount = useMemo(() => {
    if (!selectedService) return 0;
    if (!isBoarding) return priceOf(selectedService);
    if (isBoardingPackage(selectedService)) return priceOf(selectedService);
    if (hours == null) return priceOf(selectedService);
    if (hours <= 6) return 600;
    if (hours <= 12) return 900;
    return Math.ceil(hours / 24) * 1200;
  }, [hours, isBoarding, selectedService]);
  const filteredUsers = useMemo(() => {
    const term = clientSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => {
      const haystack = [
        user.name,
        user.phone,
        visibleEmail(user.email),
        ...user.pets.flatMap((pet) => [pet.name, pet.type]),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [clientSearch, users]);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users?role=CLIENT").then((res) => res.json()),
      fetch("/api/services").then((res) => res.json()),
    ]).then(([userData, serviceData]) => {
      const nextUsers = Array.isArray(userData) ? userData : [];
      const nextServices = Array.isArray(serviceData) ? serviceData : [];
      const urlClientId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("clientId") : "";
      const preselectedUser = nextUsers.find((user: User) => user.id === urlClientId) || nextUsers[0];
      setUsers(nextUsers);
      setServices(nextServices);
      setClientId(preselectedUser?.id || "");
      setPetId(preselectedUser?.pets?.[0]?.id || "");
      setClientSearch(urlClientId && preselectedUser ? `${preselectedUser.name || ""} ${preselectedUser.phone || ""}`.trim() : "");
      setServiceId(nextServices[0]?.id || "");
    }).catch(() => setError("Unable to load booking data.")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPetId(pets[0]?.id || "");
  }, [clientId, pets]);

  useEffect(() => {
    if (!selectedService || selectedService.category !== "Boarding" || isBoardingPackage(selectedService)) return;
    const slab = boardingSlabLabel(hours);
    if (!slab) return;
    const matchingService = services.find((service) => service.category === "Boarding" && service.name.includes(slab));
    if (matchingService && matchingService.id !== selectedService.id) setServiceId(matchingService.id);
  }, [hours, selectedService, services]);

  const summary = useMemo(() => selectedService ? `${selectedService.name} · ${money(calculatedAmount)}` : "-", [calculatedAmount, selectedService]);

  async function createBooking() {
    setError("");
    if (!clientId || !petId || !serviceId) {
      setError("Client, pet, and service are required.");
      return;
    }
    if (isBoarding && (!boardingSchedule.check_in_date || !boardingSchedule.check_out_date || !boardingSchedule.check_in_time || !boardingSchedule.check_out_time)) {
      setError("Check-in date, check-out date, check-in time, and check-out time are required for boarding.");
      return;
    }
    if (!isBoarding && (!slotDate || !slotTime)) {
      setError("Date and slot time are required.");
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
        slot_date: isBoarding ? boardingSchedule.check_in_date : slotDate,
        slot_time: isBoarding ? boardingSchedule.check_in_time : slotTime,
        check_in_date: isBoarding ? boardingSchedule.check_in_date : undefined,
        check_out_date: isBoarding ? boardingSchedule.check_out_date : undefined,
        check_in_time: isBoarding ? boardingSchedule.check_in_time : undefined,
        check_out_time: isBoarding ? boardingSchedule.check_out_time : undefined,
        check_in_slot: isBoarding ? boardingSchedule.check_in_slot : undefined,
        check_out_slot: isBoarding ? boardingSchedule.check_out_slot : undefined,
        boarding_type: isBoarding ? selectedService?.name : undefined,
        final_amount: calculatedAmount,
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

  async function quickCreateClientAndPet() {
    setError("");
    if (!newClient.name || !newClient.phone || !newClient.pet_name) {
      setError("Client name, phone, and pet name are required.");
      return;
    }
    setCreatingClient(true);
    const userRes = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newClient.name,
        phone: newClient.phone,
        email: newClient.email,
        role: "CLIENT",
      }),
    });
    const userData = await userRes.json().catch(() => ({}));
    if (!userRes.ok) {
      setError(userData.message || "Client could not be created.");
      setCreatingClient(false);
      return;
    }
    const petRes = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_id: userData.id,
        name: newClient.pet_name,
        type: newClient.pet_type,
        breed: newClient.breed,
        gender: newClient.gender,
        dob: newClient.dob,
        weight: newClient.weight,
        coat_type: newClient.coat_type,
        size: newClient.size,
        dietary_preference: newClient.dietary_preference,
        allergies: newClient.allergies,
        preferences: newClient.preferences,
        local_guardian_name: newClient.local_guardian_name,
        local_guardian_contact: newClient.local_guardian_contact,
        walk_schedule_1: newClient.walk_schedule_1,
        walk_schedule_2: newClient.walk_schedule_2,
        walk_schedule_3: newClient.walk_schedule_3,
        vaccination_status: newClient.vaccination_status,
        vet_name: newClient.vet_name,
        vet_contact: newClient.vet_contact,
        ongoing_medication: newClient.ongoing_medication === "Yes",
        medication_detail: newClient.medication_detail,
        illness_history: newClient.illness_history,
        tc_accepted: true,
      }),
    });
    const petData = await petRes.json().catch(() => ({}));
    if (!petRes.ok) {
      setError(petData.message || "Pet could not be created.");
      setCreatingClient(false);
      return;
    }
    const nextUser = { ...userData, pets: [petData] };
    setUsers((prev) => [nextUser, ...prev]);
    setClientId(userData.id);
    setPetId(petData.id);
    setClientSearch(`${userData.name || ""} ${userData.phone || ""}`.trim());
    setShowQuickCreate(false);
    setCreatingClient(false);
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Booking</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a booking on behalf of a customer. Detail/KYC links can be shared from the bookings list after creation.</p>
        </div>
        <Button variant="outline" asChild><Link href="/admin/bookings"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4 rounded-lg border bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-bold md:col-span-2">Find customer
              <Input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Search by name, phone, email, pet..." />
            </label>
            <label className="space-y-1 text-sm font-bold">Customer
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm font-normal">
                {filteredUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {[user.name || "Customer", user.phone, visibleEmail(user.email), user.pets.map((pet) => pet.name).join(", ")].filter(Boolean).join(" - ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-bold">Pet
              <select value={petId} onChange={(e) => setPetId(e.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm font-normal">
                {pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} ({pet.type})</option>)}
              </select>
            </label>
            <div className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => setShowQuickCreate((value) => !value)}>
                {showQuickCreate ? "Hide quick add" : "Quick add client and pet"}
              </Button>
            </div>
            <label className="space-y-1 text-sm font-bold md:col-span-2">Service
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm font-normal">
                {services.map((service) => <option key={service.id} value={service.id}>{service.category} · {service.name}</option>)}
              </select>
            </label>
          </div>

          {showQuickCreate && (
            <div className="rounded-lg border bg-muted/25 p-4">
              <h2 className="font-bold">Quick add client and pet</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Input placeholder="Client name *" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                <Input placeholder="Phone *" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value.replace(/[^\d+]/g, "").slice(0, 14) })} />
                <Input placeholder="Email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                <Input placeholder="Pet name *" value={newClient.pet_name} onChange={(e) => setNewClient({ ...newClient, pet_name: e.target.value })} />
                <select value={newClient.pet_type} onChange={(e) => setNewClient({ ...newClient, pet_type: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
                  {["Dog", "Cat", "Bird", "Other"].map((item) => <option key={item}>{item}</option>)}
                </select>
                <Input placeholder="Breed" value={newClient.breed} onChange={(e) => setNewClient({ ...newClient, breed: e.target.value })} />
                <select value={newClient.gender} onChange={(e) => setNewClient({ ...newClient, gender: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
                  <option value="">Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
                <Input type="date" value={newClient.dob} onChange={(e) => setNewClient({ ...newClient, dob: e.target.value })} />
                <Input placeholder="Weight kg" type="number" value={newClient.weight} onChange={(e) => setNewClient({ ...newClient, weight: e.target.value })} />
                <Input placeholder="Coat type" value={newClient.coat_type} onChange={(e) => setNewClient({ ...newClient, coat_type: e.target.value })} />
                <Input placeholder="Breed size" value={newClient.size} onChange={(e) => setNewClient({ ...newClient, size: e.target.value })} />
                <Input placeholder="Dietary preference" value={newClient.dietary_preference} onChange={(e) => setNewClient({ ...newClient, dietary_preference: e.target.value })} />
                <Input placeholder="Allergies" value={newClient.allergies} onChange={(e) => setNewClient({ ...newClient, allergies: e.target.value })} />
                <Input placeholder="Preferences" value={newClient.preferences} onChange={(e) => setNewClient({ ...newClient, preferences: e.target.value })} />
                <Input placeholder="Guardian name" value={newClient.local_guardian_name} onChange={(e) => setNewClient({ ...newClient, local_guardian_name: e.target.value })} />
                <Input placeholder="Guardian contact" value={newClient.local_guardian_contact} onChange={(e) => setNewClient({ ...newClient, local_guardian_contact: e.target.value })} />
                <Input placeholder="Walk schedule 1" value={newClient.walk_schedule_1} onChange={(e) => setNewClient({ ...newClient, walk_schedule_1: e.target.value })} />
                <Input placeholder="Walk schedule 2" value={newClient.walk_schedule_2} onChange={(e) => setNewClient({ ...newClient, walk_schedule_2: e.target.value })} />
                <Input placeholder="Walk schedule 3" value={newClient.walk_schedule_3} onChange={(e) => setNewClient({ ...newClient, walk_schedule_3: e.target.value })} />
                <select value={newClient.vaccination_status} onChange={(e) => setNewClient({ ...newClient, vaccination_status: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
                  <option value="">Vaccination status</option>
                  <option>Vaccinated</option>
                  <option>Not vaccinated</option>
                  <option>Partial</option>
                </select>
                <Input placeholder="Vet name" value={newClient.vet_name} onChange={(e) => setNewClient({ ...newClient, vet_name: e.target.value })} />
                <Input placeholder="Vet contact" value={newClient.vet_contact} onChange={(e) => setNewClient({ ...newClient, vet_contact: e.target.value })} />
                <select value={newClient.ongoing_medication} onChange={(e) => setNewClient({ ...newClient, ongoing_medication: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
                  <option>No</option>
                  <option>Yes</option>
                </select>
                <Input placeholder="Medication detail" value={newClient.medication_detail} onChange={(e) => setNewClient({ ...newClient, medication_detail: e.target.value })} />
                <Input placeholder="Major illness history" value={newClient.illness_history} onChange={(e) => setNewClient({ ...newClient, illness_history: e.target.value })} />
              </div>
              <div className="mt-3 flex gap-2">
                <Button type="button" onClick={quickCreateClientAndPet} disabled={creatingClient}>
                  {creatingClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save client and pet
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowQuickCreate(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {isBoarding ? (
            <div className="rounded-lg border bg-muted/25 p-4">
              <h2 className="font-bold">Boarding schedule</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-bold">Check-in date
                  <Input type="date" value={boardingSchedule.check_in_date} onChange={(e) => setBoardingSchedule((prev) => ({ ...prev, check_in_date: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm font-bold">Check-out date
                  <Input type="date" value={boardingSchedule.check_out_date} onChange={(e) => setBoardingSchedule((prev) => ({ ...prev, check_out_date: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm font-bold">Check-in time
                  <Input type="time" value={boardingSchedule.check_in_time} onChange={(e) => setBoardingSchedule((prev) => ({ ...prev, check_in_time: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm font-bold">Check-out time
                  <Input type="time" value={boardingSchedule.check_out_time} onChange={(e) => setBoardingSchedule((prev) => ({ ...prev, check_out_time: e.target.value }))} />
                </label>
                <Input placeholder="Check-in slot (optional)" value={boardingSchedule.check_in_slot} onChange={(e) => setBoardingSchedule((prev) => ({ ...prev, check_in_slot: e.target.value }))} />
                <Input placeholder="Check-out slot (optional)" value={boardingSchedule.check_out_slot} onChange={(e) => setBoardingSchedule((prev) => ({ ...prev, check_out_slot: e.target.value }))} />
              </div>
              <p className="mt-3 text-xs font-semibold text-muted-foreground">
                {hours == null ? "Enter complete check-in/check-out details to auto-calculate the boarding amount." : `Detected duration: ${hours.toFixed(1)} hours · ${boardingSlabLabel(hours) || "Package"}`}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
              <Input type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="House / society / area" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            <Input placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            <Input placeholder="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
            <Input placeholder="Pincode" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
            <Input placeholder="Phone" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/[^\d+]/g, "").slice(0, 14) })} />
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal/customer notes" className="min-h-24 w-full rounded-lg border bg-white p-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </section>

        <aside className="rounded-lg border bg-foreground p-5 text-white">
          <h2 className="font-bold">Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-white/65">Customer</span><span className="text-right font-bold">{selectedUser?.name || selectedUser?.phone || visibleEmail(selectedUser?.email) || "-"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-white/65">Pet</span><span className="text-right font-bold">{pets.find((pet) => pet.id === petId)?.name || "-"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-white/65">Service</span><span className="text-right font-bold">{summary}</span></div>
            <div className="flex justify-between gap-3"><span className="text-white/65">Schedule</span><span className="text-right font-bold">{isBoarding ? `${boardingSchedule.check_in_date || "-"} · ${boardingSchedule.check_in_time || "-"}` : `${slotDate} · ${slotTime}`}</span></div>
            {isBoarding && <div className="flex justify-between gap-3"><span className="text-white/65">Checkout</span><span className="text-right font-bold">{boardingSchedule.check_out_date || "-"} · {boardingSchedule.check_out_time || "-"}</span></div>}
            <div className="border-t border-white/15 pt-3">
              <div className="flex justify-between gap-3 text-base"><span className="text-white/80">Amount</span><span className="text-right font-extrabold">{selectedService ? money(calculatedAmount) : "-"}</span></div>
            </div>
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
