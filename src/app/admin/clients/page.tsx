"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CheckCircle2, Download, Eye, FileText, KeyRound, Loader2, Printer, Search, Share2, ShieldCheck, Trash2, UserPlus, ChevronDown, ChevronUp } from "lucide-react";

type AdminUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  is_active: boolean;
  emailVerified?: string | null;
  wallet_balance: number;
  outstanding_balance: number;
  created_at?: string;
  staffProfile?: { id: string; role: string } | null;
  addresses: { id: string; label?: string | null; line1: string; city: string; state: string; pincode: string; phone?: string | null; is_default: boolean }[];
  pets: { id: string; name: string; type: string; breed?: string | null; weight?: number | null; medical?: { vaccination_status?: string | null } | null }[];
  clientBookings: { id: string; booking_id: string; status: string; payment_status: string; slot_date: string }[];
  oldHistory?: {
    id: string;
    client_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    pet_names_json?: string[] | null;
    summary_json?: Record<string, any> | null;
    import_date?: string;
  } | null;
};

type Booking = {
  id: string;
  booking_id: string;
  status: string;
  payment_status: string;
  slot_date: string;
  slot_time: string;
  service?: { name?: string | null; category?: string | null };
  pet?: { name?: string | null; type?: string | null; breed?: string | null };
  documents?: Asset[];
};

type PetProfile = {
  id: string;
  owner_id: string;
  name: string;
  type: string;
  breed?: string | null;
  weight?: number | null;
  medical?: { vaccination_status?: string | null; vaccination_certificate_path?: string | null } | null;
};

type Asset = {
  id: string;
  original_name: string;
  path: string;
  category: string;
  document_type?: string | null;
  pet_id?: string | null;
  booking_id?: string | null;
};

type OldHistoryDetail = NonNullable<AdminUser["oldHistory"]> & {
  client_details_json?: Record<string, any> | null;
  pet_details_json?: Record<string, any>[] | null;
  health_details_json?: Record<string, any>[] | null;
  booking_history_json?: Record<string, any>[] | null;
  boarding_history_json?: Record<string, any>[] | null;
  grooming_history_json?: Record<string, any>[] | null;
  invoice_history_json?: Record<string, any>[] | null;
  payment_history_json?: Record<string, any>[] | null;
  timeline_json?: { type: string; date: string; title: string; item: Record<string, any> }[] | null;
};

const roles = ["All", "CLIENT", "STAFF", "ADMIN"];
const historyFilters = ["All", "Imported", "No imported history"];
const balanceFilters = ["All", "Outstanding", "Wallet"];
const timelineFilters = ["All history", "Bookings", "Boarding", "Grooming", "Invoices", "Payments", "Paid", "Unpaid", "Due"];

function money(value: unknown) {
  return `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
}

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function publicEmail(value?: string | null) {
  if (!value || value.endsWith("@old-import.local") || value.endsWith("@client.local")) return "-";
  return value;
}

function Stat({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-extrabold">{String(value)}</p>
    </div>
  );
}

function KeyValueGrid({ data }: { data?: Record<string, any> | null }) {
  const entries = Object.entries(data || {}).filter(([key]) => key !== "raw");
  if (!entries.length) return <p className="rounded-lg border bg-muted/25 p-3 text-sm text-muted-foreground">No data.</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border bg-muted/25 p-2">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">{key.replace(/_/g, " ")}</p>
          <p className="mt-1 break-words text-sm">{display(value)}</p>
        </div>
      ))}
    </div>
  );
}

function Rows({ rows, empty = "No records found." }: { rows?: Record<string, any>[] | null; empty?: string }) {
  if (!rows?.length) return <p className="rounded-lg border bg-muted/25 p-3 text-sm text-muted-foreground">{empty}</p>;
  const keys = Object.keys(rows[0]).filter((key) => key !== "raw");
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>{keys.map((key) => <th key={key} className="px-3 py-2">{key.replace(/_/g, " ")}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={index}>
              {keys.map((key) => (
                <td key={key} className="max-w-64 break-words px-3 py-2 align-top">{display(row[key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminClientsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [role, setRole] = useState("CLIENT");
  const [query, setQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [petQuery, setPetQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState("All");
  const [balanceFilter, setBalanceFilter] = useState("All");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [profileUser, setProfileUser] = useState<AdminUser | null>(null);
  const [profileBookings, setProfileBookings] = useState<Booking[]>([]);
  const [profilePets, setProfilePets] = useState<PetProfile[]>([]);
  const [profileAssets, setProfileAssets] = useState<Asset[]>([]);
  const [profileOldHistory, setProfileOldHistory] = useState<OldHistoryDetail | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState("All history");
  const [timelinePetFilter, setTimelinePetFilter] = useState("All pets");
  const [viewer, setViewer] = useState<{ label: string; path: string } | null>(null);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "CLIENT", petName: "", petType: "Dog", petBreed: "", petWeight: "" });

  // Document upload states
  const [uploadDocType, setUploadDocType] = useState("Aadhar Card");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPetId, setUploadPetId] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Add pet states
  const [newPetName, setNewPetName] = useState("");
  const [newPetType, setNewPetType] = useState("Dog");
  const [newPetBreed, setNewPetBreed] = useState("");
  const [newPetWeight, setNewPetWeight] = useState("");
  const [addingPet, setAddingPet] = useState(false);
  const [petError, setPetError] = useState("");
  const [showAddPet, setShowAddPet] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (role !== "All") params.set("role", role);
    if (query) params.set("q", query);
    if (phoneQuery) params.set("phone", phoneQuery);
    if (emailQuery) params.set("email", emailQuery);
    if (petQuery) params.set("pet", petQuery);
    if (historyFilter !== "All") params.set("history", historyFilter);
    if (balanceFilter !== "All") params.set("balance", balanceFilter);
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    if (res.ok) setUsers(await res.json());
    else setError("Unable to load users");
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, [role]);

  const filtered = useMemo(() => users, [users]);

  async function createUser() {
    setError("");
    setMessage("");
    setCreating(true);

    if (form.role === "CLIENT") {
      if (!form.petName.trim()) {
        setError("Pet Name is required for creating a client profile.");
        setCreating(false);
        return;
      }
      if (!form.petType.trim()) {
        setError("Pet Type is required.");
        setCreating(false);
        return;
      }
    }

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Unable to create user");
      setCreating(false);
      return;
    }

    const userData = await res.json();

    if (form.role === "CLIENT") {
      const petRes = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: userData.id,
          name: form.petName,
          type: form.petType,
          breed: form.petBreed || "",
          weight: form.petWeight ? Number(form.petWeight) : null,
          tc_accepted: true,
        }),
      });

      if (!petRes.ok) {
        const petError = await petRes.json().catch(() => ({}));
        setError(`Client created successfully, but pet registration failed: ${petError.message || "Unknown error"}`);
        await fetchUsers();
        setCreating(false);
        return;
      }
    }

    setForm({ name: "", email: "", phone: "", password: "", role: "CLIENT", petName: "", petType: "Dog", petBreed: "", petWeight: "" });
    setMessage(form.role === "CLIENT" ? "Client and pet created successfully." : "User created successfully.");
    await fetchUsers();
    setCreating(false);
  }

  async function updateUser(id: string, body: Record<string, unknown>) {
    setSavingId(id);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Unable to update user");
    } else {
      setMessage("User updated.");
    }
    await fetchUsers();
    setSavingId("");
  }

  async function resetPassword(id: string) {
    const password = passwords[id]?.trim();
    if (!password) {
      setError("Enter a new password first.");
      return;
    }
    await updateUser(id, { password });
    setPasswords((prev) => ({ ...prev, [id]: "" }));
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user permanently?")) return;
    setSavingId(id);
    setError("");
    setMessage("");
    const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.message || "Unable to delete user");
    else if (data.message?.includes("disabled")) setError(data.message);
    else setMessage("User deleted.");
    await fetchUsers();
    setSavingId("");
  }

  async function openProfile(user: AdminUser) {
    setProfileUser(user);
    setProfileOldHistory(null);
    setTimelineFilter("All history");
    setTimelinePetFilter("All pets");
    setProfileLoading(true);
    setUploadError("");
    setUploadFile(null);
    setUploadDocType("Aadhar Card");
    setUploadPetId("");
    
    // Reset Add Pet state
    setNewPetName("");
    setNewPetType("Dog");
    setNewPetBreed("");
    setNewPetWeight("");
    setPetError("");
    setShowAddPet(false);

    const [bookingRes, assetRes, petRes, historyRes] = await Promise.all([
      fetch(`/api/bookings?userId=${user.id}`),
      fetch(`/api/assets?clientId=${user.id}`),
      fetch("/api/pets"),
      user.oldHistory?.id ? fetch(`/api/admin/old-data-import?profileId=${user.oldHistory.id}`) : Promise.resolve(null),
    ]);
    if (bookingRes.ok) setProfileBookings(await bookingRes.json());
    if (assetRes.ok) setProfileAssets(await assetRes.json());
    if (petRes.ok) {
      const allPets = await petRes.json();
      const filteredPets = Array.isArray(allPets) ? allPets.filter((pet: PetProfile) => pet.owner_id === user.id) : [];
      setProfilePets(filteredPets);
      if (filteredPets.length > 0) {
        setUploadPetId(filteredPets[0].id);
      }
    }
    if (historyRes && historyRes.ok) setProfileOldHistory(await historyRes.json());
    setProfileLoading(false);
  }

  async function handleUploadDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please select a file first.");
      return;
    }
    setUploadingDoc(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("clientId", profileUser!.id);
      formData.append("documentType", uploadDocType);
      
      const isVaccine = uploadDocType === "Vaccination Certificate";
      formData.append("folder", isVaccine ? "pets" : "clients");
      formData.append("category", isVaccine ? "Vaccination" : "KYC");
      if (isVaccine && uploadPetId) {
        formData.append("petId", uploadPetId);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document");
      }

      // Refresh documents list
      const assetRes = await fetch(`/api/assets?clientId=${profileUser!.id}`);
      if (assetRes.ok) {
        setProfileAssets(await assetRes.json());
      }
      
      // If vaccination, refresh pet list too to show vaccination path
      if (isVaccine) {
        const petRes = await fetch("/api/pets");
        if (petRes.ok) {
          const allPets = await petRes.json();
          setProfilePets(Array.isArray(allPets) ? allPets.filter((pet: PetProfile) => pet.owner_id === profileUser!.id) : []);
        }
      }

      setUploadFile(null);
      setUploadError("");
      // Reset input element value
      const fileInput = document.getElementById("doc-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "An error occurred during upload.");
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleDeleteAsset(assetId: string) {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/assets?id=${assetId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to delete document");
        return;
      }
      // Refresh documents list
      const assetRes = await fetch(`/api/assets?clientId=${profileUser!.id}`);
      if (assetRes.ok) {
        setProfileAssets(await assetRes.json());
      }
      // Refresh pet list to sync vaccination certificates
      const petRes = await fetch("/api/pets");
      if (petRes.ok) {
        const allPets = await petRes.json();
        setProfilePets(Array.isArray(allPets) ? allPets.filter((pet: PetProfile) => pet.owner_id === profileUser!.id) : []);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    }
  }

  async function handleAddPet(e: React.FormEvent) {
    e.preventDefault();
    if (!newPetName.trim()) {
      setPetError("Pet Name is required.");
      return;
    }
    setAddingPet(true);
    setPetError("");
    try {
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: profileUser!.id,
          name: newPetName,
          type: newPetType,
          breed: newPetBreed || "",
          weight: newPetWeight ? Number(newPetWeight) : null,
          tc_accepted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to add pet");
      }

      // Refresh pets list
      const petRes = await fetch("/api/pets");
      if (petRes.ok) {
        const allPets = await petRes.json();
        const filteredPets = Array.isArray(allPets) ? allPets.filter((pet: PetProfile) => pet.owner_id === profileUser!.id) : [];
        setProfilePets(filteredPets);
        if (filteredPets.length > 0 && !uploadPetId) {
          setUploadPetId(filteredPets[0].id);
        }
      }

      setNewPetName("");
      setNewPetBreed("");
      setNewPetWeight("");
      setShowAddPet(false);
    } catch (err: any) {
      console.error(err);
      setPetError(err.message || "An error occurred.");
    } finally {
      setAddingPet(false);
    }
  }

  async function shareDocument(path: string) {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
  }

  function printDocument(path: string) {
    const win = window.open(path, "_blank");
    win?.addEventListener("load", () => win.print());
  }

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;
  const importedUsers = users.filter((user) => user.oldHistory).length;
  const oldSummary = profileOldHistory?.summary_json || {};
  const timelinePets = useMemo(() => {
    const pets = profileOldHistory?.pet_details_json?.map((pet) => String(pet.pet_name || "")).filter(Boolean) || [];
    return ["All pets", ...Array.from(new Set(pets))];
  }, [profileOldHistory]);
  const filteredTimeline = useMemo(() => {
    let rows = profileOldHistory?.timeline_json || [];
    if (timelineFilter !== "All history") {
      rows = rows.filter((row) => {
        if (timelineFilter === "Bookings") return row.type === "Booking";
        if (timelineFilter === "Invoices") return row.type === "Invoice";
        if (timelineFilter === "Payments") return row.type === "Payment";
        if (["Boarding", "Grooming"].includes(timelineFilter)) return row.type === timelineFilter;
        if (["Paid", "Unpaid", "Due"].includes(timelineFilter)) return String(row.item?.payment_status || "").includes(timelineFilter);
        return true;
      });
    }
    if (timelinePetFilter !== "All pets") rows = rows.filter((row) => JSON.stringify(row.item || {}).toLowerCase().includes(timelinePetFilter.toLowerCase()));
    return rows;
  }, [profileOldHistory, timelineFilter, timelinePetFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">Search clients, inspect pets, bookings, documents, and complete imported history in one place.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground">Results</p>
            <p className="text-xl font-bold">{totalUsers}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground">Active</p>
            <p className="text-xl font-bold">{activeUsers}</p>
          </div>
          <div className="rounded-lg border bg-white px-4 py-3">
            <p className="text-muted-foreground">Imported</p>
            <p className="text-xl font-bold">{importedUsers}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <h2 className="mb-4 font-bold">Create Client / User</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_160px_160px_140px_auto]">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {roles.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
          </select>
          <Button onClick={createUser} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Add
          </Button>
        </div>
        {form.role === "CLIENT" && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              🐾 Pet Details (Required for Bookings)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                placeholder="Pet Name"
                value={form.petName}
                onChange={(e) => setForm({ ...form, petName: e.target.value })}
              />
              <select
                value={form.petType}
                onChange={(e) => setForm({ ...form, petType: e.target.value })}
                className="h-11 rounded-lg border bg-white px-3 text-sm"
              >
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Other">Other</option>
              </select>
              <Input
                placeholder="Breed (e.g. Beagle)"
                value={form.petBreed}
                onChange={(e) => setForm({ ...form, petBreed: e.target.value })}
              />
              <Input
                placeholder="Weight (kg)"
                type="number"
                step="0.1"
                value={form.petWeight}
                onChange={(e) => setForm({ ...form, petWeight: e.target.value })}
              />
            </div>
          </div>
        )}
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        {message && <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-green-700"><CheckCircle2 className="h-4 w-4" /> {message}</p>}
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_150px_170px_180px_130px_170px_130px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchUsers()} placeholder="Search name, phone, email, address..." className="pl-9" />
          </div>
          <Input value={phoneQuery} onChange={(e) => setPhoneQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchUsers()} placeholder="Phone" />
          <Input value={emailQuery} onChange={(e) => setEmailQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchUsers()} placeholder="Email" />
          <Input value={petQuery} onChange={(e) => setPetQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchUsers()} placeholder="Pet or breed" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {roles.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {historyFilters.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {balanceFilters.map((item) => <option key={item}>{item}</option>)}
          </select>
          <Button variant="outline" onClick={fetchUsers}>Search</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No users found.</div>
        ) : (
          <>
          <div className="grid gap-3 p-3 lg:hidden">
            {filtered.map((user) => {
              const isExpanded = expandedClientId === user.id;
              return (
                <div key={user.id} className="rounded-lg border bg-white shadow-sm overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 select-none"
                    onClick={() => setExpandedClientId(isExpanded ? null : user.id)}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{user.name || "Unnamed user"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{user.phone || "-"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${user.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t bg-muted/5 p-4 space-y-4 text-xs text-muted-foreground">
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Full Name</label>
                          <Input defaultValue={user.name || ""} onBlur={(e) => updateUser(user.id, { name: e.target.value })} className="h-9" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Email Address</label>
                          <Input defaultValue={publicEmail(user.email) === "-" ? "" : publicEmail(user.email)} onBlur={(e) => updateUser(user.id, { email: e.target.value })} className="h-9" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Phone Number</label>
                          <Input defaultValue={user.phone || ""} onBlur={(e) => updateUser(user.id, { phone: e.target.value })} className="h-9" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Account Role</label>
                          <select value={user.role} onChange={(e) => updateUser(user.id, { role: e.target.value })} className="h-9 w-full rounded-lg border bg-white px-2.5 text-xs">
                            {roles.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Wallet Balance (₹)</label>
                            <Input type="number" defaultValue={user.wallet_balance} onBlur={(e) => updateUser(user.id, { wallet_balance: e.target.value })} className="h-9" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Outstanding (₹)</label>
                            <Input type="number" defaultValue={user.outstanding_balance} onBlur={(e) => updateUser(user.id, { outstanding_balance: e.target.value })} className="h-9" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Reset Password</label>
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              value={passwords[user.id] || ""}
                              onChange={(e) => setPasswords((prev) => ({ ...prev, [user.id]: e.target.value }))}
                              placeholder="New password"
                              className="h-9"
                            />
                            <Button size="sm" variant="outline" disabled={savingId === user.id || !passwords[user.id]} onClick={(e) => { e.stopPropagation(); resetPassword(user.id); }}>
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <hr />
                      <div className="flex flex-wrap gap-2">
                        <button onClick={(e) => { e.stopPropagation(); updateUser(user.id, { is_active: !user.is_active }); }} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${user.is_active ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                          {user.is_active ? "Active" : "Inactive"}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); updateUser(user.id, { emailVerified: !user.emailVerified }); }} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${user.emailVerified ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-700 border"}`}>
                          {user.emailVerified ? "Email verified" : "Mark verified"}
                        </button>
                      </div>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p><span className="font-semibold text-foreground">Joined:</span> {user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN") : "-"}</p>
                        <p><span className="font-semibold text-foreground">Address:</span> {user.addresses[0] ? `${user.addresses[0].line1}, ${user.addresses[0].city}` : user.oldHistory?.address || "-"}</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); openProfile(user); }}>
                          <Eye className="h-4 w-4 mr-1.5" /> Full Profile
                        </Button>
                        <Button size="sm" variant="destructive" disabled={savingId === user.id} onClick={(e) => { e.stopPropagation(); deleteUser(user.id); }}>
                          {savingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1000px] table-fixed text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[50px] px-4 py-3 text-center"></th>
                  <th className="w-[180px] px-4 py-3">Client Name</th>
                  <th className="w-[200px] px-4 py-3">Email</th>
                  <th className="w-[150px] px-4 py-3">Phone</th>
                  <th className="w-[100px] px-4 py-3">Role</th>
                  <th className="w-[120px] px-4 py-3">Status</th>
                  <th className="w-[120px] px-4 py-3">Wallet</th>
                  <th className="w-[100px] px-4 py-3">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((user) => {
                  const isExpanded = expandedClientId === user.id;
                  return (
                    <React.Fragment key={user.id}>
                      <tr
                        className={`align-middle hover:bg-muted/30 cursor-pointer transition-colors ${isExpanded ? "bg-muted/20" : ""}`}
                        onClick={() => setExpandedClientId(isExpanded ? null : user.id)}
                      >
                        <td className="px-4 py-4 text-center">
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </td>
                        <td className="px-4 py-4 font-bold text-foreground">
                          {user.name || "Unnamed user"}
                        </td>
                        <td className="px-4 py-4 truncate text-muted-foreground">
                          {publicEmail(user.email)}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {user.phone || "-"}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-semibold">{user.role}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${user.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-bold text-foreground">
                          {money(user.wallet_balance)}
                        </td>
                        <td className="px-4 py-4">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openProfile(user); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/5">
                          <td colSpan={8} className="px-6 py-4 border-t border-b">
                            <div className="grid gap-6 md:grid-cols-3">
                              {/* Column 1: Core Client Information */}
                              <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Core Info</h3>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Full Name</label>
                                    <Input defaultValue={user.name || ""} onBlur={(e) => updateUser(user.id, { name: e.target.value })} className="h-9" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Email Address</label>
                                    <Input defaultValue={publicEmail(user.email) === "-" ? "" : publicEmail(user.email)} onBlur={(e) => updateUser(user.id, { email: e.target.value })} className="h-9" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Phone Number</label>
                                    <Input defaultValue={user.phone || ""} onBlur={(e) => updateUser(user.id, { phone: e.target.value })} className="h-9" />
                                  </div>
                                  <div className="text-xs text-muted-foreground pt-1">
                                    <p><span className="font-semibold">Joined:</span> {user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN") : "-"}</p>
                                    <p className="mt-1"><span className="font-semibold">Address:</span> {user.addresses[0] ? `${user.addresses[0].line1}, ${user.addresses[0].city} ${user.addresses[0].pincode}` : user.oldHistory?.address || "No address"}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: Role, Balances & Status */}
                              <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account & Balances</h3>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Account Role</label>
                                    <select value={user.role} onChange={(e) => updateUser(user.id, { role: e.target.value })} className="h-9 w-full rounded-lg border bg-white px-2.5 text-xs">
                                      {roles.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                                    </select>
                                    {user.role === "STAFF" && (
                                      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Staff profile {user.staffProfile ? "linked" : "pending"}
                                      </p>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Wallet Balance (₹)</label>
                                      <Input type="number" defaultValue={user.wallet_balance} onBlur={(e) => updateUser(user.id, { wallet_balance: e.target.value })} className="h-9" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Outstanding (₹)</label>
                                      <Input type="number" defaultValue={user.outstanding_balance} onBlur={(e) => updateUser(user.id, { outstanding_balance: e.target.value })} className="h-9" />
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <button onClick={(e) => { e.stopPropagation(); updateUser(user.id, { is_active: !user.is_active }); }} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${user.is_active ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                                      {user.is_active ? "Active" : "Inactive"}
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); updateUser(user.id, { emailVerified: !user.emailVerified }); }} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${user.emailVerified ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-slate-100 text-slate-700 border"}`}>
                                      {user.emailVerified ? "Email verified" : "Mark verified"}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Column 3: Security & Actions */}
                              <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Security & Management</h3>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Reset Password</label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="password"
                                        value={passwords[user.id] || ""}
                                        onChange={(e) => setPasswords((prev) => ({ ...prev, [user.id]: e.target.value }))}
                                        placeholder="New password"
                                        className="h-9"
                                      />
                                      <Button size="sm" variant="outline" disabled={savingId === user.id || !passwords[user.id]} onClick={(e) => { e.stopPropagation(); resetPassword(user.id); }}>
                                        <KeyRound className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="rounded-lg border bg-amber-50/45 p-3 space-y-1 text-xs">
                                    <p className="font-semibold text-foreground">Pets ({user.pets.length}) & Bookings ({user.clientBookings.length})</p>
                                    <p className="text-[11px] text-muted-foreground">Paid: {user.clientBookings.filter((booking) => booking.payment_status === "Paid").length} bookings</p>
                                    {user.oldHistory && (
                                      <p className="mt-1.5 text-[11px] font-semibold text-amber-800 bg-amber-100/50 p-1.5 rounded">
                                        Imported History Match: {user.oldHistory.pet_names_json?.join(", ") || "Yes"}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2 pt-2">
                                    <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); openProfile(user); }}>
                                      <Eye className="h-4 w-4 mr-1.5" /> Full Profile
                                    </Button>
                                    <Button size="sm" variant="destructive" disabled={savingId === user.id} onClick={(e) => { e.stopPropagation(); deleteUser(user.id); }}>
                                      {savingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {profileUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setProfileUser(null)}>
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4">
              <div>
                <p className="text-xs font-bold uppercase text-primary">Client Profile</p>
                <h2 className="text-xl font-bold">{profileUser.name || "Client"}</h2>
                <p className="text-sm text-muted-foreground">{publicEmail(profileUser.email)} - {profileUser.phone || "-"}</p>
              </div>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/admin/bookings/new?clientId=${profileUser.id}`}>New booking</Link>
                </Button>
                <Button variant="outline" onClick={() => setProfileUser(null)}>Close</Button>
              </div>
            </div>

            {profileLoading ? (
              <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-4 p-4">
                {profileOldHistory && (
                  <section className="rounded-lg border bg-foreground p-4 text-white">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase text-white/60">Imported History</p>
                        <h3 className="text-lg font-extrabold">{profileOldHistory.client_name || profileUser.name || "Client"}</h3>
                        <p className="mt-1 text-sm text-white/70">{profileOldHistory.phone || profileUser.phone || "No phone"} - {publicEmail(profileOldHistory.email || profileUser.email)}</p>
                      </div>
                      <span className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold">Old data import</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <Stat label="Bookings" value={oldSummary.total_bookings || 0} />
                      <Stat label="Grooming" value={oldSummary.total_grooming_sessions || 0} />
                      <Stat label="Boarding" value={oldSummary.total_boarding_bookings || 0} />
                      <Stat label="Invoices" value={oldSummary.total_invoices || 0} />
                      <Stat label="Revenue" value={money(oldSummary.total_revenue)} />
                      <Stat label="Paid" value={money(oldSummary.total_paid)} />
                      <Stat label="Due" value={money(oldSummary.total_due)} />
                      <Stat label="Wallet" value={money(oldSummary.wallet_balance)} />
                      <Stat label="Outstanding" value={money(oldSummary.outstanding_balance)} />
                      <Stat label="Last booking" value={oldSummary.last_booking_date || "-"} />
                    </div>
                  </section>
                )}

                <div className="grid gap-4 lg:grid-cols-3">
                  <section className="rounded-lg border p-4">
                  <h3 className="flex items-center gap-2 font-bold"><Calendar className="h-4 w-4 text-primary" /> Bookings</h3>
                  <div className="mt-3 space-y-2">
                    {profileBookings.length === 0 ? <p className="text-sm text-muted-foreground">No bookings.</p> : profileBookings.map((booking) => (
                      <div key={booking.id} className="rounded-lg border bg-muted/25 p-3">
                        <p className="font-bold">{booking.booking_id}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{booking.service?.name || "Service"} - {booking.pet?.name || "Pet"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{new Date(booking.slot_date).toLocaleDateString("en-IN")} at {booking.slot_time}</p>
                        <p className="mt-1 text-xs font-semibold">{booking.status} - {booking.payment_status}</p>
                      </div>
                    ))}
                  </div>
                  </section>

                  <section className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">Pets and Dogs</h3>
                      <Button size="sm" variant="outline" onClick={() => setShowAddPet(!showAddPet)}>
                        {showAddPet ? "Cancel" : "+ Add Pet"}
                      </Button>
                    </div>
                    
                    {showAddPet && (
                      <form onSubmit={handleAddPet} className="mt-3 space-y-2 rounded-lg border bg-muted/10 p-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Register New Pet</p>
                        <Input
                          placeholder="Pet Name"
                          value={newPetName}
                          onChange={(e) => setNewPetName(e.target.value)}
                          required
                          className="h-9 text-xs"
                        />
                        <select
                          value={newPetType}
                          onChange={(e) => setNewPetType(e.target.value)}
                          className="w-full h-9 rounded-md border bg-white px-2.5 text-xs"
                        >
                          <option value="Dog">Dog</option>
                          <option value="Cat">Cat</option>
                          <option value="Other">Other</option>
                        </select>
                        <Input
                          placeholder="Breed (e.g. Pug)"
                          value={newPetBreed}
                          onChange={(e) => setNewPetBreed(e.target.value)}
                          className="h-9 text-xs"
                        />
                        <Input
                          placeholder="Weight (kg)"
                          type="number"
                          step="0.1"
                          value={newPetWeight}
                          onChange={(e) => setNewPetWeight(e.target.value)}
                          className="h-9 text-xs"
                        />
                        {petError && <p className="text-xs text-red-600 font-medium">{petError}</p>}
                        <Button type="submit" size="sm" className="w-full" disabled={addingPet}>
                          {addingPet ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                          Save Pet
                        </Button>
                      </form>
                    )}

                    <div className="mt-3 space-y-2">
                      {profilePets.length === 0 ? <p className="text-sm text-muted-foreground">No pets.</p> : profilePets.map((pet) => (
                        <div key={pet.id} className="rounded-lg border bg-muted/25 p-3">
                          <p className="font-bold">{pet.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{[pet.type, pet.breed, pet.weight ? `${pet.weight} kg` : ""].filter(Boolean).join(" - ")}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Vaccination: {pet.medical?.vaccination_status || "Not recorded"}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-lg border p-4">
                    <h3 className="flex items-center gap-2 font-bold"><FileText className="h-4 w-4 text-primary" /> Documents</h3>
                    
                    {/* Document Upload Form */}
                    <form onSubmit={handleUploadDocument} className="my-3 space-y-2 rounded-lg border bg-muted/10 p-3">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Upload New Document</p>
                      
                      <select
                        value={uploadDocType}
                        onChange={(e) => setUploadDocType(e.target.value)}
                        className="w-full h-9 rounded-md border bg-white px-2.5 text-xs font-semibold"
                      >
                        <option value="Aadhar Card">Aadhar Card</option>
                        <option value="PAN Card">PAN Card</option>
                        <option value="Vaccination Certificate">Vaccination Certificate</option>
                        <option value="Other Document">Other Document</option>
                      </select>

                      {uploadDocType === "Vaccination Certificate" && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase block">Select Pet</label>
                          {profilePets.length === 0 ? (
                            <p className="text-xs text-amber-600 font-semibold">Please register a pet first to upload vaccination certificate.</p>
                          ) : (
                            <select
                              value={uploadPetId}
                              onChange={(e) => setUploadPetId(e.target.value)}
                              className="w-full h-9 rounded-md border bg-white px-2.5 text-xs"
                            >
                              {profilePets.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        <Input
                          id="doc-file-input"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setUploadFile(e.target.files[0]);
                            }
                          }}
                          className="h-9 text-xs file:h-full file:text-xs"
                        />
                        <p className="text-[9px] text-muted-foreground">Supported: JPEG, PNG, WEBP, PDF (Max 10MB)</p>
                      </div>

                      {uploadError && <p className="text-xs text-red-600 font-medium">{uploadError}</p>}

                      <Button
                        type="submit"
                        size="sm"
                        className="w-full"
                        disabled={uploadingDoc || (uploadDocType === "Vaccination Certificate" && !uploadPetId)}
                      >
                        {uploadingDoc ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Upload & Compress
                      </Button>
                    </form>

                    <div className="mt-3 space-y-2">
                      {profileAssets.length === 0 ? <p className="text-sm text-muted-foreground">No linked documents.</p> : profileAssets.map((asset) => (
                        <div key={asset.id} className="rounded-lg border bg-muted/25 p-3">
                          <p className="truncate font-bold">{asset.document_type || asset.original_name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{asset.category} - {asset.original_name}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => setViewer({ label: asset.document_type || asset.original_name, path: asset.path })}><Eye className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="outline" asChild><a href={asset.path} download><Download className="h-3.5 w-3.5" /></a></Button>
                            <Button size="sm" variant="outline" onClick={() => shareDocument(asset.path)}><Share2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="outline" onClick={() => printDocument(asset.path)}><Printer className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteAsset(asset.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {profileOldHistory && (
                  <>
                    <section className="rounded-lg border p-4">
                      <h3 className="font-bold">Imported Client Details</h3>
                      <div className="mt-3"><KeyValueGrid data={profileOldHistory.client_details_json} /></div>
                    </section>
                    <section className="rounded-lg border p-4">
                      <h3 className="font-bold">Imported Pet Details</h3>
                      <div className="mt-3"><Rows rows={profileOldHistory.pet_details_json} /></div>
                    </section>
                    <section className="rounded-lg border p-4">
                      <h3 className="font-bold">Imported Health Details</h3>
                      <div className="mt-3"><Rows rows={profileOldHistory.health_details_json} /></div>
                    </section>
                    <section className="rounded-lg border p-4">
                      <h3 className="font-bold">History Timeline</h3>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <select value={timelineFilter} onChange={(e) => setTimelineFilter(e.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm">
                          {timelineFilters.map((filter) => <option key={filter}>{filter}</option>)}
                        </select>
                        <select value={timelinePetFilter} onChange={(e) => setTimelinePetFilter(e.target.value)} className="h-10 rounded-lg border bg-white px-3 text-sm">
                          {timelinePets.map((pet) => <option key={pet}>{pet}</option>)}
                        </select>
                      </div>
                      <div className="mt-3 space-y-2">
                        {filteredTimeline.map((entry, index) => (
                          <div key={`${entry.type}-${index}`} className="rounded-lg border bg-muted/20 p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-bold">{entry.title}</p>
                                <p className="text-xs text-muted-foreground">{entry.type} - {entry.date || "Not available"}</p>
                              </div>
                              {"pdf_path" in entry.item && entry.item.pdf_path ? (
                                <Button size="sm" variant="outline" asChild><a href={String(entry.item.pdf_path)} target="_blank" rel="noreferrer"><Eye className="mr-1 h-3.5 w-3.5" /> Invoice PDF</a></Button>
                              ) : null}
                            </div>
                            <div className="mt-3"><KeyValueGrid data={entry.item} /></div>
                          </div>
                        ))}
                        {!filteredTimeline.length && <p className="rounded-lg border bg-muted/25 p-3 text-sm text-muted-foreground">No imported timeline entries match these filters.</p>}
                      </div>
                    </section>
                    <section className="rounded-lg border p-4">
                      <h3 className="font-bold">Imported Booking / Invoice / Payment Tables</h3>
                      <div className="mt-3 space-y-4">
                        <Rows rows={profileOldHistory.booking_history_json} empty="No imported bookings." />
                        <Rows rows={profileOldHistory.boarding_history_json} empty="No imported boarding rows." />
                        <Rows rows={profileOldHistory.grooming_history_json} empty="No imported grooming rows." />
                        <Rows rows={profileOldHistory.invoice_history_json} empty="No imported invoices." />
                        <Rows rows={profileOldHistory.payment_history_json} empty="No imported payments." />
                      </div>
                    </section>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setViewer(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-4">
              <p className="font-bold">{viewer.label}</p>
              <Button size="sm" variant="outline" onClick={() => setViewer(null)}>Close</Button>
            </div>
            {/\.(png|jpe?g|webp|gif)$/i.test(viewer.path) ? (
              <img src={viewer.path} alt={viewer.label} className="max-h-[75vh] w-full object-contain" />
            ) : (
              <iframe src={viewer.path} title={viewer.label} className="h-[75vh] w-full" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
