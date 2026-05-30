"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, PawPrint, Plus } from "lucide-react";

type Pet = {
  id: string;
  name: string;
  type: string;
  breed?: string | null;
  gender?: string | null;
  dob?: string | null;
  weight?: number | null;
};

export default function DashboardPetsPage() {
  const { data: session } = useSession();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/users/${session.user.id}/pets`)
      .then((r) => r.json())
      .then((data) => setPets(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Pets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your pet profiles. Add new pets during booking.
          </p>
        </div>
        <Button asChild>
          <Link href="/book"><Plus className="mr-2 h-4 w-4" /> Add via Booking</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : pets.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center">
          <PawPrint className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No pets added yet. Add your first pet during booking.</p>
          <Button asChild className="mt-4">
            <Link href="/book">Book a Service</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <div key={pet.id} className="rounded-lg border bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <PawPrint className="h-5 w-5" />
                </div>
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
