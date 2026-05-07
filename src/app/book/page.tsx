"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  HeartPulse,
  Home,
  Loader2,
  MapPin,
  PawPrint,
  Plus,
  Repeat,
  Scissors,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Service = {
  id: string;
  name: string;
  category: string;
  description_short?: string | null;
  price: number;
  discounted_price?: number | null;
  slot_duration_mins: number;
  max_slots_per_day?: number | null;
};

type Pet = {
  id: string;
  name: string;
  type: string;
  breed?: string | null;
  weight?: number | null;
  medical?: { vaccination_status?: string | null } | null;
};

type Address = {
  line1: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
};

type Availability = {
  slotCounts?: Record<string, number>;
  dayCounts?: Record<string, number>;
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BUSINESS_START = 9 * 60;
const BUSINESS_END = 20 * 60;
const LUNCH_START = 13 * 60;
const LUNCH_END = 14 * 60;
const CLEANING_BUFFER = 15;

const categoryIcon: Record<string, React.ReactNode> = {
  Grooming: <Scissors className="h-4 w-4" />,
  Veterinary: <Stethoscope className="h-4 w-4" />,
  Boarding: <Home className="h-4 w-4" />,
  Training: <ShieldCheck className="h-4 w-4" />,
  Walking: <PawPrint className="h-4 w-4" />,
};

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sameDay(a: Date, b: Date) {
  return toDateKey(a) === toDateKey(b);
}

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

function minutesToLabel(minutes: number) {
  const hour24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

function priceOf(service?: Service | null) {
  return Number(service?.discounted_price || service?.price || 0);
}

function money(value: number) {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function BookPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;

  const [services, setServices] = useState<Service[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [address, setAddress] = useState<Address>({ line1: "", city: "", state: "Gujarat", pincode: "", phone: "" });
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [newPet, setNewPet] = useState({ name: "", type: "Dog", breed: "", weight: "", vaccination_status: "Vaccinated" });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedSlot, setSelectedSlot] = useState("");
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day" | "timeline">("month");
  const [staffMode, setStaffMode] = useState("Any available specialist");
  const [recurrence, setRecurrence] = useState("No repeat");
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState("Pay after confirmation");
  const [availability, setAvailability] = useState<Availability>({});
  const [pincodeState, setPincodeState] = useState<"idle" | "checking" | "ok" | "invalid">("idle");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedService = services.find((service) => service.id === selectedServiceId) || null;
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) || null;
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/book")}`);
    }
  }, [router, status]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetch("/api/services").then((res) => res.json()),
      fetch(`/api/users/${userId}/pets`).then((res) => res.json()),
      fetch(`/api/users/${userId}/address`).then((res) => res.json()),
    ]).then(([serviceData, petData, addressData]) => {
      const activeServices = Array.isArray(serviceData) ? serviceData : [];
      const userPets = Array.isArray(petData) ? petData : [];
      setServices(activeServices);
      setPets(userPets);
      if (addressData && !addressData.message) {
        setAddress({
          line1: addressData.line1 || "",
          city: addressData.city || "",
          state: addressData.state || "Gujarat",
          pincode: addressData.pincode || "",
          phone: addressData.phone || "",
        });
      }

      const serviceQuery = searchParams?.get("service")?.toLowerCase();
      const petQuery = searchParams?.get("pet");
      const initialService = serviceQuery
        ? activeServices.find((service: Service) => service.category.toLowerCase() === serviceQuery || service.name.toLowerCase().includes(serviceQuery))
        : activeServices[0];
      setSelectedServiceId(initialService?.id || "");
      setSelectedPetId(petQuery || userPets[0]?.id || "");
    }).catch(() => {
      setError("Booking details load nahi ho paaye. Please refresh karke try karein.");
    }).finally(() => setLoading(false));
  }, [searchParams, userId]);

  useEffect(() => {
    if (!selectedServiceId) return;
    const from = toDateKey(visibleMonth);
    const to = toDateKey(addDays(addMonths(visibleMonth, 1), 7));
    fetch(`/api/bookings/availability?serviceId=${selectedServiceId}&from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data) => setAvailability(data || {}))
      .catch(() => setAvailability({}));
  }, [selectedServiceId, visibleMonth]);

  useEffect(() => {
    if (!address.pincode) {
      setPincodeState("idle");
      return;
    }
    if (!/^\d{6}$/.test(address.pincode)) {
      setPincodeState("invalid");
      return;
    }
    const timer = setTimeout(() => {
      setPincodeState("checking");
      fetch(`/api/service-areas?pincode=${address.pincode}`)
        .then((res) => res.json())
        .then((data) => setPincodeState(data.serviceable ? "ok" : "invalid"))
        .catch(() => setPincodeState("ok"));
    }, 250);
    return () => clearTimeout(timer);
  }, [address.pincode]);

  const monthDays = useMemo(() => {
    const first = startOfMonth(visibleMonth);
    const start = addDays(first, -first.getDay());
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [visibleMonth]);

  const weekDays = useMemo(() => {
    const start = addDays(selectedDate, -selectedDate.getDay());
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

  const slots = useMemo(() => {
    if (!selectedService) return [];
    if (selectedService.category === "Boarding" || selectedService.slot_duration_mins >= 1440) {
      return [{ label: "Full day stay", disabled: selectedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate()), booked: false }];
    }

    const duration = Math.max(20, selectedService.slot_duration_mins || 60);
    const step = duration >= 90 ? 60 : 30;
    const capacity = selectedService.max_slots_per_day || 1;
    const dayKey = toDateKey(selectedDate);
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const result: { label: string; disabled: boolean; booked: boolean }[] = [];
    for (let start = BUSINESS_START; start + duration <= BUSINESS_END; start += step) {
      const endWithBuffer = start + duration + CLEANING_BUFFER;
      if (start < LUNCH_END && endWithBuffer > LUNCH_START) continue;
      const label = minutesToLabel(start);
      const booked = (availability.slotCounts?.[`${dayKey}|${label}`] || 0) >= capacity;
      const past = sameDay(selectedDate, new Date()) && start <= nowMinutes + 30;
      const closed = selectedDate.getDay() === 0;
      result.push({ label, disabled: booked || past || closed || selectedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate()), booked });
    }
    return result;
  }, [availability.slotCounts, selectedDate, selectedService, today]);

  const summaryNotes = [
    notes.trim() ? `Customer notes: ${notes.trim()}` : "",
    staffMode !== "Any available specialist" ? `Preferred staff: ${staffMode}` : "",
    recurrence !== "No repeat" ? `Recurring request: ${recurrence}` : "",
    paymentMode ? `Payment preference: ${paymentMode}` : "",
  ].filter(Boolean).join("\n");

  async function useMyLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Browser location support nahi kar raha. Address manually fill karein.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/location/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          const data = await res.json();
          setAddress((prev) => ({
            ...prev,
            city: data.city || prev.city,
            state: data.state || prev.state,
            pincode: data.pincode || prev.pincode,
            line1: data.displayName || prev.line1,
          }));
        } catch {
          setError("Location detect hua, par address read nahi ho paya. Manual address enter karein.");
        }
      },
      () => setError("Location permission nahi mili. Aap address aur pincode manually enter kar sakte hain."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function createPetIfNeeded() {
    if (selectedPetId) return selectedPetId;
    if (!newPet.name.trim() || !newPet.type) throw new Error("Pet name aur type required hai.");
    const res = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_id: userId,
        name: newPet.name.trim(),
        type: newPet.type,
        breed: newPet.breed,
        weight: newPet.weight,
        vaccination_status: newPet.vaccination_status,
        tc_accepted: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Pet save nahi ho paya.");
    setPets((prev) => [data, ...prev]);
    setSelectedPetId(data.id);
    return data.id as string;
  }

  async function submitBooking() {
    setError("");
    if (!userId) return;
    if (!selectedService) {
      setError("Service select karein.");
      return;
    }
    if (!selectedSlot) {
      setError("Available time slot select karein.");
      return;
    }
    if (!address.line1 || !address.city || !address.pincode || !/^\d{6}$/.test(address.pincode)) {
      setError("Complete service address aur valid 6-digit pincode required hai.");
      return;
    }

    setSaving(true);
    try {
      const petId = await createPetIfNeeded();
      await fetch(`/api/users/${userId}/address`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(address),
      });

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pet_id: petId,
          service_id: selectedService.id,
          slot_date: toDateKey(selectedDate),
          slot_time: selectedSlot,
          address,
          notes: summaryNotes || null,
        }),
      });
      const booking = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(booking.message || "Booking create nahi ho paayi.");

      router.push("/dashboard?booked=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking create nahi ho paayi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || status === "loading") {
    return (
      <main className="min-h-[70vh] bg-muted/40 px-4 py-16">
        <div className="mx-auto flex max-w-6xl items-center justify-center rounded-lg border bg-white p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  return (
    <main className="bg-muted/35 px-3 py-6 sm:px-4 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Professional Booking</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-4xl">Book pet care with live availability</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Service duration, cleaning buffer, closed days, existing bookings, pet profile, reminders, and payment preference are handled in one flow.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard">My bookings</Link>
          </Button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-primary" />
                <h2 className="font-bold">1. Choose service</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      setSelectedServiceId(service.id);
                      setSelectedSlot("");
                    }}
                    className={`min-h-31 rounded-lg border p-4 text-left transition ${selectedServiceId === service.id ? "border-primary bg-primary/6 shadow-sm" : "bg-white hover:border-primary/35"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
                        {categoryIcon[service.category] || <PawPrint className="h-4 w-4" />}
                      </span>
                      {selectedServiceId === service.id && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    <h3 className="mt-3 font-bold">{service.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{service.description_short || service.category}</p>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{money(priceOf(service))}</span>
                      <span className="text-muted-foreground">{service.slot_duration_mins >= 1440 ? "Full day" : `${service.slot_duration_mins} min + buffer`}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <PawPrint className="h-5 w-5 text-primary" />
                <h2 className="font-bold">2. Pet details</h2>
              </div>
              {pets.length > 0 && (
                <div className="mb-4 grid gap-2 sm:grid-cols-2">
                  {pets.map((pet) => (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => setSelectedPetId(pet.id)}
                      className={`rounded-lg border p-3 text-left ${selectedPetId === pet.id ? "border-primary bg-primary/6" : "hover:border-primary/35"}`}
                    >
                      <p className="font-bold">{pet.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{[pet.breed, pet.type, pet.medical?.vaccination_status].filter(Boolean).join(" · ")}</p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedPetId("")}
                    className={`rounded-lg border border-dashed p-3 text-left ${!selectedPetId ? "border-primary bg-primary/6" : "hover:border-primary/35"}`}
                  >
                    <p className="flex items-center gap-2 font-bold"><Plus className="h-4 w-4" /> Add another pet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Useful for new pet profile and medical notes.</p>
                  </button>
                </div>
              )}
              {(!selectedPetId || pets.length === 0) && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Input placeholder="Pet name" value={newPet.name} onChange={(e) => setNewPet({ ...newPet, name: e.target.value })} />
                  <select value={newPet.type} onChange={(e) => setNewPet({ ...newPet, type: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
                    <option>Dog</option>
                    <option>Cat</option>
                    <option>Bird</option>
                    <option>Other</option>
                  </select>
                  <Input placeholder="Breed" value={newPet.breed} onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })} />
                  <Input placeholder="Weight kg" inputMode="decimal" value={newPet.weight} onChange={(e) => setNewPet({ ...newPet, weight: e.target.value.replace(/[^\d.]/g, "") })} />
                  <select value={newPet.vaccination_status} onChange={(e) => setNewPet({ ...newPet, vaccination_status: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm sm:col-span-2">
                    <option>Vaccinated</option>
                    <option>Partially vaccinated</option>
                    <option>Not vaccinated</option>
                    <option>Unknown</option>
                  </select>
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <h2 className="font-bold">3. Advanced calendar</h2>
                </div>
                <div className="grid grid-cols-4 rounded-lg bg-muted p-1 text-xs font-bold">
                  {(["month", "week", "day", "timeline"] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setCalendarView(view)}
                      className={`px-2 py-2 capitalize ${calendarView === view ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                <div className="rounded-lg border p-3">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-extrabold">{calendarView === "day" ? selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : monthLabel(visibleMonth)}</p>
                    <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {calendarView === "month" && (
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {WEEK_DAYS.map((day) => <div key={day} className="py-2 text-[11px] font-bold text-muted-foreground">{day}</div>)}
                      {monthDays.map((day) => {
                        const dateKey = toDateKey(day);
                        const past = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const closed = day.getDay() === 0;
                        const outMonth = day.getMonth() !== visibleMonth.getMonth();
                        const count = availability.dayCounts?.[dateKey] || 0;
                        return (
                          <button
                            key={dateKey}
                            type="button"
                            disabled={past || closed}
                            onClick={() => {
                              setSelectedDate(day);
                              setSelectedSlot("");
                            }}
                            className={`min-h-14 rounded-lg border p-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-35 ${sameDay(day, selectedDate) ? "border-primary bg-primary text-white" : "hover:border-primary/50"} ${outMonth ? "bg-muted/40 text-muted-foreground" : "bg-white"}`}
                          >
                            <span className="font-bold">{day.getDate()}</span>
                            <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${closed ? "bg-red-400" : count ? "bg-amber-400" : "bg-green-400"}`} />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {calendarView === "week" && (
                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map((day) => (
                        <button
                          key={toDateKey(day)}
                          type="button"
                          disabled={day.getDay() === 0 || day < new Date(today.getFullYear(), today.getMonth(), today.getDate())}
                          onClick={() => {
                            setSelectedDate(day);
                            setVisibleMonth(startOfMonth(day));
                            setSelectedSlot("");
                          }}
                          className={`min-h-28 rounded-lg border p-2 text-center disabled:opacity-35 ${sameDay(day, selectedDate) ? "border-primary bg-primary text-white" : "bg-white hover:border-primary/50"}`}
                        >
                          <p className="text-xs font-bold">{WEEK_DAYS[day.getDay()]}</p>
                          <p className="mt-2 text-2xl font-extrabold">{day.getDate()}</p>
                          <p className="mt-2 text-[11px]">{day.getDay() === 0 ? "Closed" : `${availability.dayCounts?.[toDateKey(day)] || 0} booked`}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {calendarView === "day" && (
                    <div className="space-y-2">
                      {Array.from({ length: 12 }, (_, index) => BUSINESS_START + index * 60).map((minute) => (
                        <button
                          key={minute}
                          type="button"
                          onClick={() => setSelectedSlot(minutesToLabel(minute))}
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-sm ${selectedSlot === minutesToLabel(minute) ? "border-primary bg-primary/8" : "bg-white"}`}
                        >
                          <span className="font-bold">{minutesToLabel(minute)}</span>
                          <span className="text-xs text-muted-foreground">{minute >= LUNCH_START && minute < LUNCH_END ? "Break" : "Service window"}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {calendarView === "timeline" && (
                    <div className="space-y-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.label}
                          type="button"
                          disabled={slot.disabled}
                          onClick={() => setSelectedSlot(slot.label)}
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left disabled:opacity-40 ${selectedSlot === slot.label ? "border-primary bg-primary/8" : "bg-white"}`}
                        >
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-bold">{slot.label}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{slot.booked ? "Booked" : "Open"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/35 p-3">
                    <p className="text-sm font-bold">{selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Sunday closed, lunch break blocked, past slots disabled, cleaning buffer included.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.label}
                        type="button"
                        disabled={slot.disabled}
                        onClick={() => setSelectedSlot(slot.label)}
                        className={`min-h-12 rounded-lg border px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-35 ${selectedSlot === slot.label ? "border-primary bg-primary text-white" : "bg-white hover:border-primary/45"}`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                  {slots.length === 0 && <p className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-700">Is date par koi slot available nahi hai.</p>}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-bold">4. Address and pincode</h2>
              </div>
              <div className="space-y-3">
                <Button type="button" variant="outline" className="w-full" onClick={useMyLocation}>
                  <MapPin className="mr-2 h-4 w-4" /> Use my location
                </Button>
                <Input placeholder="House / society / area" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                  <Input placeholder="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Pincode" inputMode="numeric" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
                  <Input placeholder="Phone" inputMode="tel" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/[^\d+]/g, "").slice(0, 14) })} />
                </div>
                <p className={`text-xs font-semibold ${pincodeState === "invalid" ? "text-red-600" : "text-green-700"}`}>
                  {pincodeState === "checking" && "Checking pincode..."}
                  {pincodeState === "ok" && "All valid pincodes are enabled right now."}
                  {pincodeState === "invalid" && "Please enter a valid 6-digit pincode."}
                  {pincodeState === "idle" && "Pincode whitelist feature ready hai; abhi sab valid pincodes allowed hain."}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <h2 className="font-bold">Operations</h2>
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-bold text-muted-foreground">Staff preference</label>
                <select value={staffMode} onChange={(e) => setStaffMode(e.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm">
                  <option>Any available specialist</option>
                  <option>Senior groomer</option>
                  <option>Vet/doctor only</option>
                  <option>Same handler as last visit</option>
                </select>
                <label className="block text-xs font-bold text-muted-foreground">Recurring booking</label>
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm">
                  <option>No repeat</option>
                  <option>Repeat weekly</option>
                  <option>Repeat monthly</option>
                  <option>Custom recurrence requested</option>
                </select>
                <label className="block text-xs font-bold text-muted-foreground">Payment</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="h-11 w-full rounded-lg border bg-white px-3 text-sm">
                  <option>Pay after confirmation</option>
                  <option>Full online payment requested</option>
                  <option>Deposit booking requested</option>
                </select>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-24 w-full rounded-lg border bg-white p-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Allergies, aggressive behaviour, special shampoo, pickup instructions..."
                />
              </div>
            </div>

            <div className="rounded-lg border bg-foreground p-4 text-white shadow-sm sm:p-5">
              <h2 className="font-bold">Booking summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3"><span className="text-white/65">Service</span><span className="text-right font-bold">{selectedService?.name || "-"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/65">Pet</span><span className="text-right font-bold">{selectedPet?.name || newPet.name || "-"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/65">Date</span><span className="text-right font-bold">{selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/65">Slot</span><span className="text-right font-bold">{selectedSlot || "-"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/65">Price</span><span className="text-right font-bold">{selectedService ? money(priceOf(selectedService)) : "-"}</span></div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-white/70">
                <span className="rounded-lg bg-white/10 p-2"><Repeat className="mx-auto mb-1 h-4 w-4" />Reminders</span>
                <span className="rounded-lg bg-white/10 p-2"><CreditCard className="mx-auto mb-1 h-4 w-4" />Payment</span>
                <span className="rounded-lg bg-white/10 p-2"><FileText className="mx-auto mb-1 h-4 w-4" />Invoice</span>
              </div>
              <Button type="button" className="mt-5 w-full bg-white text-foreground hover:bg-white/90" onClick={submitBooking} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Confirm booking
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <BookPageContent />
    </Suspense>
  );
}
