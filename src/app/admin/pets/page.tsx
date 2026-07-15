"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Loader2, PawPrint, Search, Trash2 } from "lucide-react";
import VaccinationManager from "@/components/reminders/vaccination-manager";

type Pet = {
  id: string;
  owner_id: string;
  name: string;
  type: string;
  breed?: string | null;
  gender?: string | null;
  dob?: string | null;
  dob_is_estimated?: boolean | null;
  birthday_reminder_enabled?: boolean | null;
  weight?: number | null;
  coat_type?: string | null;
  size?: string | null;
  allergies?: string | null;
  dietary_preference?: string | null;
  owner?: { name?: string | null; email?: string | null; phone?: string | null };
  medical?: { vaccination_status?: string | null; vet_name?: string | null; vet_contact?: string | null } | null;
};

export default function AdminPetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [expandedPetId, setExpandedPetId] = useState<string | null>(null);

  async function fetchPets() {
    setLoading(true);
    const res = await fetch("/api/pets");
    if (res.ok) {
      setPets(await res.json());
      setError("");
    } else {
      setError("Unable to load pets.");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPets();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return pets;
    return pets.filter((pet) => [pet.name, pet.type, pet.breed, pet.owner?.name, pet.owner?.email, pet.owner?.phone].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
  }, [pets, query]);

  async function updatePet(id: string, body: Record<string, unknown>) {
    setSavingId(id);
    const res = await fetch("/api/pets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Pet could not be updated.");
    }
    await fetchPets();
    setSavingId("");
  }

  async function deletePet(id: string) {
    if (!confirm("Delete this pet? Pets with bookings cannot be deleted.")) return;
    setSavingId(id);
    const res = await fetch(`/api/pets?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Pet could not be deleted.");
    }
    await fetchPets();
    setSavingId("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and update pet profiles, vaccination status, coat details, and care notes.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      <div className="rounded-lg border bg-white p-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pet, owner, breed, phone..." className="pl-9" />
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No pets found.</div>
        ) : (
          <>
          <div className="grid gap-3 p-3 lg:hidden">
            {filtered.map((pet) => {
              const isExpanded = expandedPetId === pet.id;
              return (
              <div key={pet.id} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex cursor-pointer items-start gap-3" onClick={() => setExpandedPetId(isExpanded ? null : pet.id)}>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <PawPrint className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{pet.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{[pet.type, pet.breed, pet.weight ? `${pet.weight} kg` : ""].filter(Boolean).join(" - ")}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{pet.owner?.name || "Customer"} - {pet.owner?.phone || pet.owner?.email || "-"}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
                {isExpanded && (
                  <div className="mt-3 border-t pt-3">
                    <div className="grid gap-2 text-xs sm:grid-cols-2">
                      <div className="rounded-lg bg-muted/45 p-2">
                        <p className="text-muted-foreground">Care</p>
                        <p className="mt-1 font-semibold">{[pet.size, pet.coat_type, pet.dietary_preference].filter(Boolean).join(" - ") || "Not recorded"}</p>
                      </div>
                      <div className="rounded-lg bg-muted/45 p-2">
                        <p className="text-muted-foreground">Medical</p>
                        <p className="mt-1 font-semibold">{pet.medical?.vaccination_status || "Not recorded"}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Input defaultValue={pet.name} onBlur={(e) => updatePet(pet.id, { name: e.target.value })} className="h-9" />
                      <Input defaultValue={pet.breed || ""} placeholder="Breed" onBlur={(e) => updatePet(pet.id, { breed: e.target.value })} className="h-9" />
                      <Input defaultValue={pet.weight || ""} placeholder="Weight" onBlur={(e) => updatePet(pet.id, { weight: e.target.value })} className="h-9" />
                      <Input defaultValue={pet.size || ""} placeholder="Size" onBlur={(e) => updatePet(pet.id, { size: e.target.value })} className="h-9" />
                    </div>
                    <label className="mt-2 block text-xs text-muted-foreground">Date of birth
                      <Input type="date" defaultValue={pet.dob ? pet.dob.slice(0, 10) : ""} onBlur={(e) => updatePet(pet.id, { dob: e.target.value || null })} className="mt-1 h-9" />
                    </label>
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" variant="destructive" disabled={savingId === pet.id} onClick={() => deletePet(pet.id)}>
                        {savingId === pet.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                      <VaccinationManager
                        petId={pet.id}
                        ownerId={pet.owner_id}
                        petName={pet.name}
                        dob={pet.dob ?? null}
                        dobIsEstimated={Boolean(pet.dob_is_estimated)}
                        birthdayReminderEnabled={pet.birthday_reminder_enabled ?? true}
                        isOperations
                      />
                    </div>
                  </div>
                )}
              </div>
            );})}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-250 text-left text-sm">
              <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="w-12 px-4 py-3"></th>
                  <th className="px-4 py-3">Pet</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Care Profile</th>
                  <th className="px-4 py-3">Medical</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((pet) => {
                  const isExpanded = expandedPetId === pet.id;
                  return (
                  <Fragment key={pet.id}>
                  <tr className={`cursor-pointer align-middle hover:bg-muted/30 ${isExpanded ? "bg-muted/20" : ""}`} onClick={() => setExpandedPetId(isExpanded ? null : pet.id)}>
                    <td className="px-4 py-4 text-center">
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <PawPrint className="mt-2 h-4 w-4 text-primary" />
                        <div>
                          <p className="font-bold">{pet.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{[pet.type, pet.breed].filter(Boolean).join(" - ") || "-"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{pet.owner?.name || "Customer"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{pet.owner?.email || "-"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{pet.owner?.phone || "-"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{[pet.weight ? `${pet.weight} kg` : "", pet.size, pet.coat_type].filter(Boolean).join(" - ") || "Not recorded"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{pet.dietary_preference || pet.allergies || "No diet/allergy notes"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{pet.medical?.vaccination_status || "Not recorded"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{pet.medical?.vet_name || "No vet"} {pet.medical?.vet_contact ? `· ${pet.medical.vet_contact}` : ""}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Button size="sm" variant="destructive" disabled={savingId === pet.id} onClick={() => deletePet(pet.id)}>
                        {savingId === pet.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-muted/5">
                      <td colSpan={6} className="border-t px-6 py-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pet details</p>
                            <Input defaultValue={pet.name} onBlur={(e) => updatePet(pet.id, { name: e.target.value })} className="h-9" />
                            <div className="grid grid-cols-2 gap-2">
                              <select defaultValue={pet.type} onBlur={(e) => updatePet(pet.id, { type: e.currentTarget.value })} className="h-9 rounded-lg border bg-white px-2 text-xs">
                                {["Dog", "Cat", "Bird", "Other"].map((item) => <option key={item}>{item}</option>)}
                              </select>
                              <Input defaultValue={pet.breed || ""} placeholder="Breed" onBlur={(e) => updatePet(pet.id, { breed: e.target.value })} className="h-9" />
                            </div>
                            <label className="block text-xs text-muted-foreground">Date of birth
                              <Input type="date" defaultValue={pet.dob ? pet.dob.slice(0, 10) : ""} onBlur={(e) => updatePet(pet.id, { dob: e.target.value || null })} className="mt-1 h-9" />
                            </label>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Care profile</p>
                            <div className="grid grid-cols-2 gap-2">
                              <Input defaultValue={pet.weight || ""} placeholder="Weight" onBlur={(e) => updatePet(pet.id, { weight: e.target.value })} className="h-9" />
                              <Input defaultValue={pet.size || ""} placeholder="Size" onBlur={(e) => updatePet(pet.id, { size: e.target.value })} className="h-9" />
                              <Input defaultValue={pet.coat_type || ""} placeholder="Coat" onBlur={(e) => updatePet(pet.id, { coat_type: e.target.value })} className="h-9" />
                              <Input defaultValue={pet.dietary_preference || ""} placeholder="Diet" onBlur={(e) => updatePet(pet.id, { dietary_preference: e.target.value })} className="h-9" />
                            </div>
                            <Input defaultValue={pet.allergies || ""} placeholder="Allergies" onBlur={(e) => updatePet(pet.id, { allergies: e.target.value })} className="h-9" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Medical</p>
                            <div className="rounded-lg border bg-white p-3 text-xs">
                              <p className="font-semibold">{pet.medical?.vaccination_status || "Not recorded"}</p>
                              <p className="mt-1 text-muted-foreground">{pet.medical?.vet_name || "No vet"} {pet.medical?.vet_contact ? `- ${pet.medical.vet_contact}` : ""}</p>
                            </div>
                            <Button size="sm" variant="destructive" disabled={savingId === pet.id} onClick={() => deletePet(pet.id)}>
                              {savingId === pet.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                              Delete pet
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                          <VaccinationManager
                            petId={pet.id}
                            ownerId={pet.owner_id}
                            petName={pet.name}
                            dob={pet.dob ?? null}
                            dobIsEstimated={Boolean(pet.dob_is_estimated)}
                            birthdayReminderEnabled={pet.birthday_reminder_enabled ?? true}
                            isOperations
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );})}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
