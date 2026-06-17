"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Loader2, Printer, Search, Share2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Asset = {
  id: string;
  original_name: string;
  path: string;
  document_type?: string | null;
  client_id?: string | null;
  pet_id?: string | null;
  booking_id?: string | null;
  created_at: string;
};

type Pet = {
  id: string;
  name: string;
  type: string;
  breed?: string | null;
  owner?: { name?: string | null; email?: string | null; phone?: string | null };
};

export default function VaccinationCertificatesPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [viewer, setViewer] = useState<{ label: string; path: string } | null>(null);

  async function fetchData() {
    setLoading(true);
    const [assetRes, petRes] = await Promise.all([
      fetch("/api/assets?category=Vaccination"),
      fetch("/api/pets"),
    ]);
    if (assetRes.ok) setAssets(await assetRes.json());
    if (petRes.ok) setPets(await petRes.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const petById = useMemo(() => new Map(pets.map((pet) => [pet.id, pet])), [pets]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return assets;
    return assets.filter((asset) => {
      const pet = asset.pet_id ? petById.get(asset.pet_id) : null;
      return [asset.original_name, asset.document_type, pet?.name, pet?.breed, pet?.owner?.name, pet?.owner?.email, pet?.owner?.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [assets, petById, query]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vaccination Certificates</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search vaccination certificates by client and dog or pet.</p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client, pet, phone, certificate..." className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center text-sm text-muted-foreground">No vaccination certificates found.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((asset) => {
            const pet = asset.pet_id ? petById.get(asset.pet_id) : null;
            return (
              <div key={asset.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{pet?.name || "Pet not linked"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{pet?.owner?.name || "Client not linked"} - {pet?.owner?.phone || pet?.owner?.email || "-"}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{asset.original_name}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewer({ label: asset.original_name, path: asset.path })}><Eye className="mr-1 h-3.5 w-3.5" /> View</Button>
                  <Button size="sm" variant="outline" asChild><a href={asset.path} download><Download className="mr-1 h-3.5 w-3.5" /> Download</a></Button>
                  <Button size="sm" variant="outline" onClick={() => shareDocument(asset.path)}><Share2 className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => printDocument(asset.path)}><Printer className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewer(null)}>
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
