"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CalendarPlus, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type User = { id: string; name?: string | null; email?: string | null; phone?: string | null; pets: { id: string; name: string; type: string }[] };
type Service = { id: string; name: string; category: string; service_group?: string | null; breed_size?: string | null; coat_type?: string | null; session_count?: number | null; price: number; discounted_price?: number | null; slot_duration_mins: number; max_slots_per_day?: number | null };

function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function tomorrowKey() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return dateKey(date);
}

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function formatServiceLabel(service: Service) {
  return [
    service.name,
    service.breed_size,
    service.coat_type,
    service.session_count ? (service.session_count === 1 ? "Single" : `${service.session_count} sessions`) : "",
  ].filter(Boolean).join(" · ");
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
  const [bookingMode, setBookingMode] = useState<"existing" | "new">("existing");
  const [clientId, setClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [petId, setPetId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [slotDate, setSlotDate] = useState(tomorrowKey());
  const [slotTime, setSlotTime] = useState("10:00");
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [boardingSchedule, setBoardingSchedule] = useState<BoardingSchedule>({
    check_in_date: tomorrowKey(),
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
  const monthDays = useMemo(() => {
    const first = startOfMonth(visibleMonth);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [visibleMonth]);
  const groupedServices = useMemo(() => {
    const grouped = new Map<string, Map<string, Service[]>>();
    for (const service of services) {
      const category = service.category || "Other";
      const group = service.service_group || category;
      if (!grouped.has(category)) grouped.set(category, new Map());
      const categoryGroups = grouped.get(category)!;
      categoryGroups.set(group, [...(categoryGroups.get(group) || []), service]);
    }
    return Array.from(grouped.entries()).map(([category, groups]) => ({
      category,
      groups: Array.from(groups.entries()).map(([group, items]) => ({ group, items })),
    }));
  }, [services]);

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
      const mode = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("mode") : "";
      const nextMode = mode === "new" ? "new" : "existing";
      const preselectedUser = nextMode === "new" ? undefined : nextUsers.find((user: User) => user.id === urlClientId) || nextUsers[0];
      setBookingMode(nextMode);
      setUsers(nextUsers);
      setServices(nextServices);
      setClientId(preselectedUser?.id || "");
      setPetId(preselectedUser?.pets?.[0]?.id || "");
      setClientSearch(urlClientId && preselectedUser ? `${preselectedUser.name || ""} ${preselectedUser.phone || ""}`.trim() : "");
      setServiceId(nextServices[0]?.id || "");
      setShowQuickCreate(nextMode === "new");
    }).catch(() => setError("Unable to load booking data.")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPetId(pets[0]?.id || "");
  }, [clientId, pets]);

  function startNewClientFlow() {
    setBookingMode("new");
    setClientId("");
    setPetId("");
    setClientSearch("");
    setShowQuickCreate(true);
  }

  function startExistingClientFlow() {
    const firstUser = users[0];
    setBookingMode("existing");
    setShowQuickCreate(false);
    setClientId(firstUser?.id || "");
    setPetId(firstUser?.pets?.[0]?.id || "");
  }

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isBoarding) {
      if (!boardingSchedule.check_in_date || !boardingSchedule.check_out_date || !boardingSchedule.check_in_time || !boardingSchedule.check_out_time) {
        setError("Check-in date, check-out date, check-in time, and check-out time are required for boarding.");
        return;
      }
      
      const checkInD = new Date(boardingSchedule.check_in_date);
      const checkOutD = new Date(boardingSchedule.check_out_date);

      if (checkInD < today) {
        setError("Check-in date cannot be in the past.");
        return;
      }
      if (checkOutD < checkInD) {
        setError("Check-out date must be on or after the check-in date.");
        return;
      }
      if (checkInD.getDay() === 0) {
        setError("Sundays are blocked. Check-in date cannot be a Sunday.");
        return;
      }
      if (checkOutD.getDay() === 0) {
        setError("Sundays are blocked. Check-out date cannot be a Sunday.");
        return;
      }
    } else {
      if (!slotDate || !slotTime) {
        setError("Date and slot time are required.");
        return;
      }
      const slotD = new Date(slotDate);
      if (slotD < today) {
        setError("Booking date cannot be in the past.");
        return;
      }
      if (slotD.getDay() === 0) {
        setError("Sundays are blocked for service bookings.");
        return;
      }
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
          <p className="mt-1 text-sm text-muted-foreground">Choose an existing client or add a new client and pet, then create their booking from the same flow.</p>
        </div>
        <Button variant="outline" asChild><Link href="/admin/bookings"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4 rounded-lg border bg-white p-5">
          <div className="grid gap-2 rounded-lg bg-muted p-1 text-sm font-bold sm:grid-cols-2">
            <button type="button" onClick={startExistingClientFlow} className={`rounded-lg px-3 py-2 ${bookingMode === "existing" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}>
              Existing client
            </button>
            <button type="button" onClick={startNewClientFlow} className={`rounded-lg px-3 py-2 ${bookingMode === "new" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}>
              New client only
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {bookingMode === "existing" && <>
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
              <Button type="button" variant="outline" onClick={startNewClientFlow}>
                Quick add new client and pet
              </Button>
            </div>
            </>}
            {bookingMode === "new" && !showQuickCreate && selectedUser && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm md:col-span-2"><p className="font-bold text-emerald-800">New client ready: {selectedUser.name}</p><p className="mt-1 text-emerald-700">{selectedUser.phone || visibleEmail(selectedUser.email)} · {pets.map((pet) => pet.name).join(", ")}</p></div>}
            <label className="space-y-1 text-sm font-bold md:col-span-2">Service
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm font-normal">
                {groupedServices.map((category) => category.groups.map((group) => (
                  <optgroup key={`${category.category}-${group.group}`} label={`${category.category} / ${group.group}`}>
                    {group.items.map((service) => <option key={service.id} value={service.id}>{formatServiceLabel(service)} · {money(priceOf(service))}</option>)}
                  </optgroup>
                )))}
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
                <Button type="button" variant="outline" onClick={startExistingClientFlow}>Cancel</Button>
              </div>
            </div>
          )}

          {isBoarding ? (
            <div className="rounded-lg border bg-muted/25 p-4">
              <h2 className="font-bold">Boarding schedule</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-bold">Check-in date
                  <Input 
                    type="date" 
                    min={dateKey(new Date())}
                    value={boardingSchedule.check_in_date} 
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (d.getDay() === 0) {
                        setError("Sundays are blocked. Please select a weekday.");
                      } else {
                        setError("");
                      }
                      setBoardingSchedule((prev) => ({ ...prev, check_in_date: e.target.value }));
                    }} 
                  />
                </label>
                <label className="space-y-1 text-sm font-bold">Check-out date
                  <Input 
                    type="date" 
                    min={boardingSchedule.check_in_date || dateKey(new Date())}
                    value={boardingSchedule.check_out_date} 
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      if (d.getDay() === 0) {
                        setError("Sundays are blocked. Please select a weekday.");
                      } else {
                        setError("");
                      }
                      setBoardingSchedule((prev) => ({ ...prev, check_out_date: e.target.value }));
                    }} 
                  />
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
            <div className="rounded-lg border bg-muted/25 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold">Advanced calendar</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Past dates and Sundays are blocked for new service bookings.</p>
                </div>
                <label className="space-y-1 text-sm font-bold">Slot time
                  <Input type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} />
                </label>
              </div>
              <div className="mt-4 rounded-lg border bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-muted/45 p-2">
                  <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="text-sm font-extrabold">{monthLabel(visibleMonth)}</p>
                  <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
                  {WEEK_DAYS.map((day) => <div key={day} className="py-1 text-[10px] font-bold text-muted-foreground sm:py-2 sm:text-[11px]">{day}</div>)}
                  {monthDays.map((day) => {
                    const value = dateKey(day);
                    const today = new Date();
                    const past = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const closed = day.getDay() === 0;
                    const outMonth = day.getMonth() !== visibleMonth.getMonth();
                    const selected = value === slotDate;
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={past || closed}
                        onClick={() => setSlotDate(value)}
                        className={`min-h-12 rounded-lg border p-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-16 sm:p-1.5 ${selected ? "border-primary bg-primary text-white shadow-sm" : "bg-white hover:border-primary/50"} ${outMonth ? "text-muted-foreground" : ""}`}
                      >
                        <span className="block text-left font-bold">{day.getDate()}</span>
                        <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${closed ? "bg-red-400" : "bg-green-400"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
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
