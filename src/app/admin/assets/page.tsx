"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

type Asset = {
  id: string;
  filename: string;
  original_name: string;
  path: string;
  category: string;
  created_at: string;
};

const CATEGORIES = ["All", "Hero", "Services", "Pets", "Bookings", "General"];

export default function AdminAssetsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [category, setCategory] = useState("General");
  const [filter, setFilter] = useState("All");
  const [folder, setFolder] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchAssets() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "All") params.set("category", filter);
    const res = await fetch(`/api/assets?${params.toString()}`);
    if (res.ok) setAssets(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchAssets();
  }, [filter]);

  async function uploadAsset() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.set("file", file);
    formData.set("category", category);
    formData.set("folder", folder || category.toLowerCase());
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Upload failed");
    }
    if (fileRef.current) fileRef.current.value = "";
    await fetchAssets();
    setUploading(false);
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset from server storage?")) return;
    await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
    await fetchAssets();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload and manage files on your own server storage. Files are served from /uploads.</p>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
          <Input ref={fileRef} type="file" accept="image/*,.pdf" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {CATEGORIES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
          </select>
          <Input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Folder" />
          <Button onClick={uploadAsset} disabled={uploading}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload
          </Button>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${filter === item ? "border-primary bg-primary text-white" : "bg-white text-muted-foreground hover:text-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : assets.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center">
          <ImagePlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No assets uploaded yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-lg border bg-white">
              <div className="relative aspect-[4/3] bg-muted">
                {/\.(png|jpe?g|webp|gif)$/i.test(asset.filename) ? (
                  <Image src={asset.path} alt={asset.original_name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">PDF</div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="truncate text-sm font-bold">{asset.original_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{asset.category} · {new Date(asset.created_at).toLocaleDateString("en-IN")}</p>
                </div>
                <Input readOnly value={asset.path} className="h-9 text-xs" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigator.clipboard.writeText(asset.path)}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteAsset(asset.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
