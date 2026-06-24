"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Loader2, PawPrint, Plus } from "lucide-react";

type Pet = {
  id: string;
  name: string;
  type: string;
  breed?: string | null;
  gender?: string | null;
  dob?: string | null;
  weight?: number | null;
  profile_photo?: string | null;
  photos_array?: string[] | null;
};

export default function DashboardPetsPage() {
  const { data: session } = useSession();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", type: "Dog", breed: "", gender: "", weight: "", vaccination_status: "" });
  const [photo, setPhoto] = useState<File | null>(null);

  async function fetchPets() {
    if (!session?.user?.id) return;
    setLoading(true);
    fetch(`/api/users/${session.user.id}/pets`)
      .then((r) => r.json())
      .then((data) => setPets(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPets();
  }, [session?.user?.id]);

  async function uploadPhoto() {
    if (!photo || !session?.user?.id) return "";
    const formData = new FormData();
    formData.append("file", photo);
    formData.append("folder", "pets");
    formData.append("category", "Pets");
    formData.append("clientId", session.user.id);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Photo upload failed");
    return data.url || data.path || "";
  }

  async function addPet(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) return;
    setSaving(true);
    setError("");
    try {
      const photoUrl = await uploadPhoto();
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: session.user.id,
          name: form.name,
          type: form.type,
          breed: form.breed,
          gender: form.gender,
          weight: form.weight,
          vaccination_status: form.vaccination_status,
          profile_photo: photoUrl || undefined,
          photos_array: photoUrl ? [photoUrl] : [],
          tc_accepted: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Unable to add pet");
      setForm({ name: "", type: "Dog", breed: "", gender: "", weight: "", vaccination_status: "" });
      setPhoto(null);
      setShowForm(false);
      await fetchPets();
    } catch (err: any) {
      setError(err.message || "Unable to add pet");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Pets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your pet profiles. Add new pets during booking.
          </p>
        </div>
        <Button type="button" onClick={() => setShowForm((value) => !value)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Pet
        </Button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

      {showForm && (
        <form onSubmit={addPet} className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <Input required placeholder="Pet name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
              {["Dog", "Cat", "Bird", "Other"].map((item) => <option key={item}>{item}</option>)}
            </select>
            <Input placeholder="Breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
              <option value="">Gender</option>
              <option>Male</option>
              <option>Female</option>
            </select>
            <Input placeholder="Weight kg" inputMode="decimal" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value.replace(/[^\d.]/g, "") })} />
            <select value={form.vaccination_status} onChange={(e) => setForm({ ...form, vaccination_status: e.target.value })} className="h-11 rounded-lg border bg-white px-3 text-sm">
              <option value="">Vaccination status</option>
              <option>Vaccinated</option>
              <option>Partial</option>
              <option>Not Vaccinated</option>
            </select>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border bg-muted/25 px-3 text-sm font-medium text-muted-foreground">
              <Camera className="h-4 w-4" />
              <span>{photo ? photo.name : "Upload pet photo"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.name}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save pet</Button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : pets.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center">
          <PawPrint className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No pets added yet. Add your first pet profile now.</p>
          <Button type="button" className="mt-4" onClick={() => setShowForm(true)}>
            Add Pet
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <div key={pet.id} className="rounded-lg border bg-white p-5">
              <div className="flex items-center gap-3">
                {pet.profile_photo ? (
                  <img src={pet.profile_photo} alt={pet.name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <PawPrint className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <p className="font-bold">{pet.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[pet.type, pet.breed, pet.gender].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              {(pet.weight || pet.dob) && (
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  {pet.weight && <span>{pet.weight} kg</span>}
                  {pet.dob && <span>Born {new Date(pet.dob).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
