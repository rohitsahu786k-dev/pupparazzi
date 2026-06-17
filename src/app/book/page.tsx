"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  HeartPulse,
  Home,
  Loader2,
  MapPin,
  ImagePlus,
  PawPrint,
  Plus,
  Repeat,
  Scissors,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TicketPercent,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FILE_COMPRESSOR_URL, isUploadTooLarge, MAX_UPLOAD_FILE_SIZE_MB, UPLOAD_SIZE_ERROR_MESSAGE } from "@/lib/upload-limits";

type Service = {
  id: string;
  name: string;
  category: string;
  description_short?: string | null;
  free_services_json?: string[] | null;
  price: number;
  discounted_price?: number | null;
  slot_duration_mins: number;
  max_slots_per_day?: number | null;
  addons?: Addon[];
};

type Addon = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
};

type Pet = {
  id: string;
  name: string;
  type: string;
  breed?: string | null;
  weight?: number | null;
  profile_photo?: string | null;
  photos_array?: string[] | null;
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

type AppliedCoupon = {
  code: string;
  description: string;
  discount: number;
  terms: string;
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BUSINESS_START = 9 * 60;
const BUSINESS_END = 20 * 60;
const LUNCH_START = 13 * 60;
const LUNCH_END = 14 * 60;
const CLEANING_BUFFER = 15;
const COD_ADVANCE_AMOUNT = 100;

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

function paymentPlanFromMode(mode: string) {
  if (mode === "Cash on Delivery (Testing)") return "COD_TEST";
  return mode === "Cash on Delivery + Rs. 100 advance" ? "COD_ADVANCE" : "FULL_ONLINE";
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function serviceMatchesPackage(service: Service, breed: string, coat: string, sessions: string) {
  return service.category === "Grooming"
    && service.name.includes(breed)
    && service.name.includes(coat)
    && (sessions === "Single Session" ? service.name.includes("Single Session") : service.name.includes(`${sessions} Sessions`));
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
  const [serviceCategory, setServiceCategory] = useState("Grooming");
  const [groomingBreed, setGroomingBreed] = useState("Large Breed");
  const [groomingCoat, setGroomingCoat] = useState("Long Coat");
  const [groomingSessions, setGroomingSessions] = useState("12");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [newPet, setNewPet] = useState({ name: "", type: "Dog", breed: "", vaccination_status: "Vaccinated" });
  const [petImages, setPetImages] = useState<File[]>([]);
  const [petImagePreviews, setPetImagePreviews] = useState<string[]>([]);
  const [uploadingPetImages, setUploadingPetImages] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [boardingSchedule, setBoardingSchedule] = useState({
    check_in_date: toDateKey(new Date()),
    check_out_date: "",
    check_in_time: "",
    check_out_time: "",
    check_in_slot: "",
    check_out_slot: "",
  });
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedSlot, setSelectedSlot] = useState("");
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [staffMode, setStaffMode] = useState("Any available specialist");
  const [recurrence, setRecurrence] = useState("No repeat");
  const [notes, setNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash on Delivery (Testing)");
  const [availability, setAvailability] = useState<Availability>({});
  const [pincodeState, setPincodeState] = useState<"idle" | "checking" | "ok" | "invalid">("idle");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [couponChecking, setCouponChecking] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  const selectedService = services.find((service) => service.id === selectedServiceId) || null;
  const selectedPet = pets.find((pet) => pet.id === selectedPetId) || null;
  const today = useMemo(() => new Date(), []);
  const selectedAddons = useMemo(() => selectedService?.addons?.filter((addon) => selectedAddonIds.includes(addon.id)) || [], [selectedAddonIds, selectedService]);
  const servicePrice = priceOf(selectedService);
  const addonTotal = selectedAddons.reduce((sum, addon) => sum + Number(addon.price || 0), 0);
  const subtotal = servicePrice + addonTotal;
  const couponDiscount = Math.min(coupon?.discount || 0, subtotal);
  const total = Math.max(0, subtotal - couponDiscount);
  const visibleServices = useMemo(() => services.filter((service) => service.category === serviceCategory), [serviceCategory, services]);

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
      setServiceCategory(initialService?.category || "Grooming");
      setSelectedPetId(petQuery || userPets[0]?.id || "");
    }).catch(() => {
      setError("Booking details could not be loaded. Please refresh and try again.");
    }).finally(() => setLoading(false));
  }, [searchParams, userId]);

  useEffect(() => {
    if (serviceCategory !== "Grooming") return;
    const match = services.find((service) => serviceMatchesPackage(service, groomingBreed, groomingCoat, groomingSessions));
    if (match) {
      setSelectedServiceId(match.id);
      setSelectedAddonIds([]);
      setCoupon(null);
      setCouponMessage("");
    }
  }, [groomingBreed, groomingCoat, groomingSessions, serviceCategory, services]);

  useEffect(() => {
    setSelectedAddonIds([]);
    setCoupon(null);
    setCouponMessage("");
  }, [selectedServiceId]);

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
    selectedAddons.length ? `Add-ons: ${selectedAddons.map((addon) => addon.name).join(", ")}` : "",
    coupon ? `Coupon: ${coupon.code} (-${money(coupon.discount)})` : "",
  ].filter(Boolean).join("\n");

  useEffect(() => {
    const urls = petImages.map((file) => URL.createObjectURL(file));
    setPetImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [petImages]);

  function handlePetImageSelection(files?: FileList | null) {
    const selectedFiles = Array.from(files || []).slice(0, 4);
    const oversizedFile = selectedFiles.find((file) => isUploadTooLarge(file));
    if (oversizedFile) {
      setError(UPLOAD_SIZE_ERROR_MESSAGE);
      setPetImages([]);
      return;
    }
    setError("");
    setPetImages(selectedFiles);
  }

  async function applyCoupon() {
    if (!selectedService || !couponCode.trim()) return;
    setCouponChecking(true);
    setCouponMessage("");
    setCoupon(null);
    try {
      const params = new URLSearchParams({
        code: couponCode.trim().toUpperCase(),
        subtotal: String(subtotal),
        category: selectedService.category,
      });
      const res = await fetch(`/api/coupons?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.valid) throw new Error(data.message || "Coupon could not be applied.");
      setCoupon({
        code: data.coupon.code,
        description: data.coupon.description,
        discount: Number(data.discount || 0),
        terms: data.coupon.terms,
      });
      setCouponMessage(data.message || "Coupon applied.");
    } catch (err) {
      setCouponMessage(err instanceof Error ? err.message : "Coupon could not be applied.");
    } finally {
      setCouponChecking(false);
    }
  }

  async function useMyLocation() {
    setError("");
    if (!navigator.geolocation) {
      setError("Your browser does not support location detection. Please enter your address manually.");
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
          setError("Location was detected, but the address could not be read. Please enter your address manually.");
        }
      },
      () => setError("Location permission was not granted. You can enter your address and pincode manually."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function createPetIfNeeded() {
    if (selectedPetId) return selectedPetId;
    if (!newPet.name.trim() || !newPet.type) throw new Error("Pet name and type are required.");
    setUploadingPetImages(petImages.length > 0);
    const uploadedImages: string[] = [];
    try {
      for (const file of petImages) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "pets");
        formData.append("category", "Pets");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const upload = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) throw new Error(upload.error || "Pet image upload failed.");
        uploadedImages.push(upload.secure_url || upload.url || upload.path);
      }
    } finally {
      setUploadingPetImages(false);
    }
    const res = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_id: userId,
        name: newPet.name.trim(),
        type: newPet.type,
        breed: newPet.breed,
        vaccination_status: newPet.vaccination_status,
        profile_photo: uploadedImages[0] || null,
        photos_array: uploadedImages,
        tc_accepted: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Pet could not be saved.");
    setPets((prev) => [data, ...prev]);
    setSelectedPetId(data.id);
    return data.id as string;
  }

  async function submitBooking() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError("");
    if (!userId) {
      submittingRef.current = false;
      setSaving(false);
      return;
    }
    if (!selectedService) {
      setError("Please select a service.");
      submittingRef.current = false;
      setSaving(false);
      return;
    }
    if (!selectedSlot && selectedService.category !== "Boarding") {
      setError("Please select an available time slot.");
      submittingRef.current = false;
      setSaving(false);
      return;
    }
    if (selectedService.category === "Boarding" && (!boardingSchedule.check_in_date || !boardingSchedule.check_out_date || !boardingSchedule.check_in_time || !boardingSchedule.check_out_time)) {
      setError("Check-in date, check-out date, check-in time, and check-out time are required for boarding.");
      submittingRef.current = false;
      setSaving(false);
      return;
    }
    if (!address.line1 || !address.city || !address.pincode || !/^\d{6}$/.test(address.pincode)) {
      setError("A complete service address and a valid 6-digit pincode are required.");
      submittingRef.current = false;
      setSaving(false);
      return;
    }

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
          slot_date: selectedService.category === "Boarding" ? boardingSchedule.check_in_date : toDateKey(selectedDate),
          slot_time: selectedService.category === "Boarding" ? boardingSchedule.check_in_time : selectedSlot,
          check_in_date: selectedService.category === "Boarding" ? boardingSchedule.check_in_date : undefined,
          check_out_date: selectedService.category === "Boarding" ? boardingSchedule.check_out_date : undefined,
          check_in_time: selectedService.category === "Boarding" ? boardingSchedule.check_in_time : undefined,
          check_out_time: selectedService.category === "Boarding" ? boardingSchedule.check_out_time : undefined,
          check_in_slot: selectedService.category === "Boarding" ? boardingSchedule.check_in_slot : undefined,
          check_out_slot: selectedService.category === "Boarding" ? boardingSchedule.check_out_slot : undefined,
          boarding_type: selectedService.category === "Boarding" ? selectedService.name : undefined,
          address,
          notes: summaryNotes || null,
          addons_json: {
            addons: selectedAddons.map((addon) => ({ id: addon.id, name: addon.name, price: addon.price })),
            coupon: coupon ? { code: coupon.code, discount: couponDiscount, terms: coupon.terms } : null,
            payment: {
              plan: paymentPlanFromMode(paymentMode),
              mode: paymentMode,
              advanceAmount: paymentPlanFromMode(paymentMode) === "COD_ADVANCE" ? COD_ADVANCE_AMOUNT : total,
              remainingCodAmount: paymentPlanFromMode(paymentMode) === "COD_ADVANCE" ? Math.max(0, total - COD_ADVANCE_AMOUNT) : 0,
            },
            pricing: { servicePrice, addonTotal, subtotal, couponDiscount, total },
          },
        }),
      });
      const booking = await bookingRes.json();
      if (!bookingRes.ok) throw new Error(booking.message || "Booking could not be created.");

      const paymentPlan = paymentPlanFromMode(paymentMode);
      if (paymentPlan === "COD_TEST") {
        router.push(`/dashboard/bookings/${booking.id}/details`);
        return;
      }
      const paymentAmount = paymentPlan === "COD_ADVANCE" ? COD_ADVANCE_AMOUNT : total;
      const loaded = await loadRazorpay();
      if (!loaded) throw new Error("Payment gateway could not be loaded. Please try again.");

      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          receipt: booking.booking_id,
          notes: { bookingId: booking.id, paymentPlan },
        }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.message || "Payment order could not be created.");

      await new Promise<void>((resolve, reject) => {
        const checkout = new (window as any).Razorpay({
          key: order.key,
          amount: order.amount,
          currency: order.currency || "INR",
          name: "Pupparazzi",
          description: paymentPlan === "COD_ADVANCE" ? "COD advance payment" : "Full booking payment",
          order_id: order.id,
          prefill: {
            name: session?.user?.name || "",
            email: session?.user?.email || "",
            contact: address.phone,
          },
          handler: async (response: any) => {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                bookingId: booking.id,
                amount: paymentAmount,
                paymentType: paymentPlan === "COD_ADVANCE" ? "advance" : "full",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verify = await verifyRes.json().catch(() => ({}));
            if (!verifyRes.ok) reject(new Error(verify.message || "Payment verification failed."));
            else resolve();
          },
          modal: {
            ondismiss: () => reject(new Error("Payment was not completed. Your booking is pending until payment succeeds.")),
          },
        });
        checkout.open();
      });

      router.push(`/dashboard/bookings/${booking.id}/details`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking could not be created.");
    } finally {
      submittingRef.current = false;
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
          <section className="space-y-4 min-w-0">
            <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <HeartPulse className="h-5 w-5 text-primary" />
                <h2 className="font-bold">1. Choose service</h2>
              </div>
              <div className="mb-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-2 text-xs font-bold sm:grid-cols-5 lg:grid-cols-2">
                  {["Grooming", "Boarding", "Walking", "Swimming", "Veterinary", "Training"].map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setServiceCategory(category);
                        const first = services.find((service) => service.category === category);
                        setSelectedServiceId(first?.id || "");
                      }}
                      className={`rounded-lg px-3 py-2 ${serviceCategory === category ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
                {serviceCategory === "Grooming" && (
                  <div className="grid gap-2 rounded-lg border bg-white p-2 sm:grid-cols-3">
                    <select value={groomingBreed} onChange={(e) => setGroomingBreed(e.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm">
                      <option>Small Breed</option>
                      <option>Large Breed</option>
                      <option>Extra Large Breed</option>
                    </select>
                    <select value={groomingCoat} onChange={(e) => setGroomingCoat(e.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm">
                      <option>Long Coat</option>
                      <option>Short Coat</option>
                    </select>
                    <select value={groomingSessions} onChange={(e) => setGroomingSessions(e.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm">
                      <option>Single Session</option>
                      <option>6</option>
                      <option>12</option>
                      <option>24</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleServices.map((service) => (
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
                      <span className="font-bold text-foreground">
                        {service.discounted_price ? <><span className="mr-1 text-muted-foreground line-through">{money(service.price)}</span>{money(priceOf(service))}</> : money(priceOf(service))}
                      </span>
                      <span className="text-muted-foreground">{service.slot_duration_mins >= 1440 ? "Full day" : `${service.slot_duration_mins} min + buffer`}</span>
                    </div>
                  </button>
                ))}
              </div>
              {selectedService?.free_services_json && (
                <div className="mt-4 rounded-lg border bg-muted/35 p-3">
                  <p className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-primary" /> Included</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedService.free_services_json.map((item) => <span key={item} className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-muted-foreground">{item}</span>)}
                  </div>
                </div>
              )}
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
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-muted">
                          {pet.profile_photo ? (
                            <Image src={pet.profile_photo} alt={pet.name} fill className="object-cover" sizes="48px" />
                          ) : (
                            <PawPrint className="m-3 h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <span>
                          <span className="font-bold">{pet.name}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{[pet.breed, pet.type, pet.medical?.vaccination_status].filter(Boolean).join(" - ")}</span>
                        </span>
                      </div>
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input placeholder="Pet name *" value={newPet.name} onChange={(e) => setNewPet({ ...newPet, name: e.target.value })} />
                  <select value={newPet.type} onChange={(e) => setNewPet({ ...newPet, type: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
                    <option>Dog</option>
                    <option>Cat</option>
                    <option>Bird</option>
                    <option>Other</option>
                  </select>
                  <Input placeholder="Breed (optional)" value={newPet.breed} onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })} />
                  <select value={newPet.vaccination_status} onChange={(e) => setNewPet({ ...newPet, vaccination_status: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
                    <option>Vaccinated</option>
                    <option>Partially vaccinated</option>
                    <option>Not vaccinated</option>
                    <option>Unknown</option>
                  </select>
                  <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-center text-sm font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground sm:col-span-2">
                    <ImagePlus className="h-5 w-5 text-primary" />
                    <span>{petImages.length ? `${petImages.length} image selected` : "Upload pet images"}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      Up to {MAX_UPLOAD_FILE_SIZE_MB} MB each. Need to reduce your document size?{" "}
                      <a href={FILE_COMPRESSOR_URL} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">
                        Compress your file here
                      </a>
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        handlePetImageSelection(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {petImagePreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 sm:col-span-2">
                      {petImagePreviews.map((src, index) => (
                        <div key={src} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                          <Image src={src} alt={`Pet preview ${index + 1}`} fill className="object-cover" sizes="96px" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedService?.category === "Boarding" && (
              <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" />
                  <h2 className="font-bold">3. Boarding schedule</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted-foreground">Check-in date *</label>
                    <Input
                      type="date"
                      value={boardingSchedule.check_in_date}
                      onChange={(e) => {
                        setBoardingSchedule((prev) => ({ ...prev, check_in_date: e.target.value }));
                        if (e.target.value) {
                          const next = new Date(e.target.value);
                          if (!Number.isNaN(next.getTime())) {
                            setSelectedDate(next);
                            setVisibleMonth(startOfMonth(next));
                          }
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted-foreground">Check-out date *</label>
                    <Input type="date" value={boardingSchedule.check_out_date} onChange={(e) => setBoardingSchedule((prev) => ({ ...prev, check_out_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted-foreground">Check-in time *</label>
                    <Input type="time" value={boardingSchedule.check_in_time} onChange={(e) => setBoardingSchedule((prev) => ({ ...prev, check_in_time: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted-foreground">Check-out time *</label>
                    <Input type="time" value={boardingSchedule.check_out_time} onChange={(e) => setBoardingSchedule((prev) => ({ ...prev, check_out_time: e.target.value }))} />
                  </div>
                  <Input placeholder="Check-in slot (optional)" value={boardingSchedule.check_in_slot} onChange={(e) => setBoardingSchedule((prev) => ({ ...prev, check_in_slot: e.target.value }))} />
                  <Input placeholder="Check-out slot (optional)" value={boardingSchedule.check_out_slot} onChange={(e) => setBoardingSchedule((prev) => ({ ...prev, check_out_slot: e.target.value }))} />
                </div>
              </div>
            )}

            <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <h2 className="font-bold">{selectedService?.category === "Boarding" ? "4" : "3"}. Advanced calendar</h2>
                </div>
                <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-bold">
                  {(["month", "week"] as const).map((view) => (
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

              <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <div className="rounded-lg border bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-muted/45 p-2">
                    <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-extrabold">{monthLabel(visibleMonth)}</p>
                    <button type="button" onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {calendarView === "month" && (
                    <div className="grid grid-cols-7 gap-1 text-center sm:gap-1.5">
                      {WEEK_DAYS.map((day) => <div key={day} className="py-1 text-[10px] font-bold text-muted-foreground sm:py-2 sm:text-[11px]">{day}</div>)}
                      {monthDays.map((day) => {
                        const dateKey = toDateKey(day);
                        const past = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const closed = day.getDay() === 0;
                        const outMonth = day.getMonth() !== visibleMonth.getMonth();
                        const count = availability.dayCounts?.[dateKey] || 0;
                        const capacity = selectedService?.max_slots_per_day || 4;
                        const dayStatus = count >= capacity ? "Fully booked" : count >= Math.max(1, capacity - 2) ? "Few slots" : "Available";
                        return (
                          <button
                            key={dateKey}
                            type="button"
                            disabled={past || closed}
                            onClick={() => {
                              setSelectedDate(day);
                              setSelectedSlot("");
                            }}
                            className={`min-h-12 rounded-lg border p-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-18 sm:p-1.5 ${sameDay(day, selectedDate) ? "border-primary bg-primary text-white shadow-sm" : "hover:border-primary/50"} ${outMonth ? "bg-muted/40 text-muted-foreground" : "bg-white"}`}
                          >
                            <span className="block text-left font-bold">{day.getDate()}</span>
                            <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full sm:mt-2 ${closed || dayStatus === "Fully booked" ? "bg-red-400" : dayStatus === "Few slots" ? "bg-amber-400" : "bg-green-400"}`} />
                            <span className="mt-0.5 hidden truncate text-[10px] sm:mt-1 sm:block">{closed ? "Closed" : dayStatus}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {calendarView === "week" && (
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
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
                          className={`min-h-20 overflow-hidden rounded-lg border p-1 text-center disabled:opacity-35 sm:min-h-28 sm:p-2 ${sameDay(day, selectedDate) ? "border-primary bg-primary text-white" : "bg-white hover:border-primary/50"}`}
                        >
                          <p className="text-[10px] font-bold sm:text-xs">{WEEK_DAYS[day.getDay()]}</p>
                          <p className="mt-1 text-lg font-extrabold sm:mt-2 sm:text-2xl">{day.getDate()}</p>
                          <p className="mt-1 truncate text-[8px] sm:mt-2 sm:text-[11px]">{day.getDay() === 0 ? "Closed" : `${availability.dayCounts?.[toDateKey(day)] || 0} bkd`}</p>
                        </button>
                      ))}
                    </div>
                  )}

                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/35 p-3">
                    <p className="text-sm font-bold">{selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Choose one open slot. Past slots, lunch break and Sunday are blocked.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3">
                    {slots.map((slot) => (
                      <button
                        key={slot.label}
                        type="button"
                        disabled={slot.disabled}
                        onClick={() => setSelectedSlot(slot.label)}
                        className={`min-h-11 rounded-lg border px-2 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-12 sm:px-3 sm:text-sm ${selectedSlot === slot.label ? "border-primary bg-primary text-white" : "bg-white hover:border-primary/45"}`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                  {slots.length === 0 && <p className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-700">No slots are available for this date.</p>}
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-bold">{selectedService?.category === "Boarding" ? "5" : "4"}. Address and pincode</h2>
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
                  {pincodeState === "idle" && "Pincode whitelist support is ready; all valid pincodes are currently allowed."}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <h2 className="font-bold">Operations</h2>
              </div>
              <div className="space-y-3">
                {selectedService?.addons?.length ? (
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground">Service add-ons</label>
                    <div className="mt-2 space-y-2">
                      {selectedService.addons.map((addon) => (
                        <label key={addon.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                          <span>
                            <span className="font-bold">{addon.name}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{addon.description}</span>
                          </span>
                          <span className="flex items-center gap-2 font-bold">
                            {money(addon.price)}
                            <input
                              type="checkbox"
                              checked={selectedAddonIds.includes(addon.id)}
                              onChange={(e) => {
                                setCoupon(null);
                                setCouponMessage("");
                                setSelectedAddonIds((prev) => e.target.checked ? [...prev, addon.id] : prev.filter((id) => id !== addon.id));
                              }}
                            />
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground">Coupon code</label>
                  <div className="mt-2 flex gap-2">
                    <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="FIRST10" />
                    <Button type="button" variant="outline" onClick={applyCoupon} disabled={couponChecking || !couponCode.trim()}>
                      {couponChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <TicketPercent className="h-4 w-4" />}
                    </Button>
                  </div>
                  {couponMessage && <p className={`mt-2 text-xs font-semibold ${coupon ? "text-green-700" : "text-red-600"}`}>{couponMessage}</p>}
                  {coupon?.terms && <p className="mt-1 text-xs text-muted-foreground">{coupon.terms}</p>}
                </div>
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
                  <option>Cash on Delivery (Testing)</option>
                  <option>Full Online Payment</option>
                  <option>Cash on Delivery + Rs. 100 advance</option>
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
                <div className="flex justify-between gap-3"><span className="text-white/65">Date</span><span className="text-right font-bold">{selectedService?.category === "Boarding" && boardingSchedule.check_in_date ? new Date(boardingSchedule.check_in_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/65">Slot</span><span className="text-right font-bold">{selectedService?.category === "Boarding" ? boardingSchedule.check_in_time || "-" : selectedSlot || "-"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-white/65">Service price</span><span className="text-right font-bold">{selectedService ? money(servicePrice) : "-"}</span></div>
                {addonTotal > 0 && <div className="flex justify-between gap-3"><span className="text-white/65">Add-ons</span><span className="text-right font-bold">{money(addonTotal)}</span></div>}
                {couponDiscount > 0 && <div className="flex justify-between gap-3"><span className="text-white/65">Coupon</span><span className="text-right font-bold">-{money(couponDiscount)}</span></div>}
                {paymentPlanFromMode(paymentMode) === "COD_ADVANCE" && <div className="flex justify-between gap-3"><span className="text-white/65">Pay now</span><span className="text-right font-bold">{money(COD_ADVANCE_AMOUNT)}</span></div>}
                {paymentPlanFromMode(paymentMode) === "COD_ADVANCE" && <div className="flex justify-between gap-3"><span className="text-white/65">Remaining COD</span><span className="text-right font-bold">{money(Math.max(0, total - COD_ADVANCE_AMOUNT))}</span></div>}
                {paymentPlanFromMode(paymentMode) === "COD_TEST" && <div className="flex justify-between gap-3"><span className="text-white/65">Pay now</span><span className="text-right font-bold">Rs. 0</span></div>}
                {paymentPlanFromMode(paymentMode) === "COD_TEST" && <div className="flex justify-between gap-3"><span className="text-white/65">Cash on delivery</span><span className="text-right font-bold">{money(total)}</span></div>}
                <div className="border-t border-white/15 pt-3">
                  <div className="flex justify-between gap-3 text-base"><span className="text-white/80">Total</span><span className="text-right font-extrabold">{selectedService ? money(total) : "-"}</span></div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] text-white/70">
                <span className="rounded-lg bg-white/10 p-2"><Repeat className="mx-auto mb-1 h-4 w-4" />Reminders</span>
                <span className="rounded-lg bg-white/10 p-2"><CreditCard className="mx-auto mb-1 h-4 w-4" />Payment</span>
                <span className="rounded-lg bg-white/10 p-2"><FileText className="mx-auto mb-1 h-4 w-4" />Invoice</span>
              </div>
              <Button type="button" className="mt-5 w-full bg-white text-foreground hover:bg-white/90" onClick={submitBooking} disabled={saving || uploadingPetImages}>
                {saving || uploadingPetImages ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                {saving || uploadingPetImages ? "Booking..." : "Confirm booking"}
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
