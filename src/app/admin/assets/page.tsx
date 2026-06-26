"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Download, Eye, ImagePlus, Loader2, Printer, Share2, Trash2, Upload } from "lucide-react";
import { FILE_COMPRESSOR_URL, isUploadTooLarge, MAX_UPLOAD_FILE_SIZE_MB, UPLOAD_SIZE_ERROR_MESSAGE } from "@/lib/upload-limits";

type Asset = {
  id: string;
  filename: string;
  original_name: string;
  path: string;
  category: string;
  document_type?: string | null;
  created_at: string;
};

const CATEGORIES = ["All", "Documents", "KYC", "Pets", "Bookings", "Services", "Hero", "General"];
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pupparazziclub.in";

export default function AdminAssetsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [category, setCategory] = useState("Documents");
  const [filter, setFilter] = useState("All");
  const [folder, setFolder] = useState("client-documents");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{ label: string; path: string } | null>(null);
  const [error, setError] = useState("");
  const [brokenPreviews, setBrokenPreviews] = useState<Record<string, true>>({});

  async function fetchAssets() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "All") params.set("category", filter);
    const res = await fetch(`/api/assets?${params.toString()}`);
    if (res.ok) {
      setAssets(await res.json());
      setBrokenPreviews({});
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchAssets();
  }, [filter]);

  async function uploadAsset() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError("");
    if (isUploadTooLarge(file)) {
      setError(UPLOAD_SIZE_ERROR_MESSAGE);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setUploading(true);
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

  async function shareAsset(path: string) {
    const url = assetUrl(path);
    if (navigator.share) {
      await navigator.share({ url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(url);
  }

  function printAsset(path: string) {
    const win = window.open(assetUrl(path), "_blank");
    win?.addEventListener("load", () => win.print());
  }

  function assetUrl(path: string) {
    const origin = typeof window === "undefined" ? SITE_URL : window.location.origin;
    return new URL(path, origin).toString();
  }

  function isImageAsset(asset: Asset) {
    return /\.(png|jpe?g|webp|gif)$/i.test(asset.filename) || /\/image\/upload\//i.test(asset.path);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Client Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage client, pet, booking, KYC, and service documents from one place.</p>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_180px_180px_auto]">
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
        <p className="mt-3 text-xs text-muted-foreground">
          Maximum file size per asset: {MAX_UPLOAD_FILE_SIZE_MB} MB. Need to reduce your document size? Compress your file here:{" "}
          <a href={FILE_COMPRESSOR_URL} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">
            {FILE_COMPRESSOR_URL}
          </a>
        </p>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
          <p className="text-sm text-muted-foreground">No client documents uploaded yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-lg border bg-white">
              <div className="relative aspect-[4/3] bg-muted">
                {isImageAsset(asset) && !brokenPreviews[asset.id] ? (
                  <img
                    src={asset.path}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setBrokenPreviews((current) => ({ ...current, [asset.id]: true }))}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-4 text-center text-sm font-semibold text-muted-foreground">
                    <ImagePlus className="mb-2 h-8 w-8" />
                    <span>{isImageAsset(asset) ? "Preview unavailable" : "PDF"}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5">{asset.original_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{asset.document_type || asset.category} - {new Date(asset.created_at).toLocaleDateString("en-IN")}</p>
                </div>
                <Input readOnly value={assetUrl(asset.path)} className="h-9 text-xs" />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigator.clipboard.writeText(assetUrl(asset.path))}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteAsset(asset.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button size="sm" variant="outline" onClick={() => setViewer({ label: asset.original_name, path: assetUrl(asset.path) })}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" asChild><a href={assetUrl(asset.path)} download><Download className="h-3.5 w-3.5" /></a></Button>
                  <Button size="sm" variant="outline" onClick={() => shareAsset(asset.path)}><Share2 className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => printAsset(asset.path)}><Printer className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewer(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-4">
              <p className="font-bold">{viewer.label}</p>
              <Button size="sm" variant="outline" onClick={() => setViewer(null)}>Close</Button>
            </div>
            {/\.(png|jpe?g|webp|gif)$/i.test(viewer.path) || /\/image\/upload\//i.test(viewer.path) ? (
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
