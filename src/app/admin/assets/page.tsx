"use client";

import { useEffect, useRef, useState } from "react";
import { assetFileUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Download, Eye, ImagePlus, Loader2, Printer, Search, Share2, Trash2, Upload } from "lucide-react";
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

const CATEGORIES = ["All", "General", "Services", "Hero", "Documents", "KYC", "Pets", "Bookings", "Vaccination", "Old Invoice PDF"];
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pupparazziclub.in";

export default function AdminAssetsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const fetchVersion = useRef(0);
  const [category, setCategory] = useState("General");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{ label: string; path: string; image: boolean } | null>(null);
  const [error, setError] = useState("");
  const [brokenPreviews, setBrokenPreviews] = useState<Record<string, true>>({});

  async function fetchAssets() {
    const version = ++fetchVersion.current;
    setLoading(true);
    const params = new URLSearchParams({ paginated: "true", page: String(page) });
    if (filter !== "All") params.set("category", filter);
    if (query) params.set("q", query);
    try {
      const res = await fetch(`/api/assets?${params.toString()}`);
      if (!res.ok) throw new Error("Unable to load files. Please retry.");
      const data = await res.json();
      if (version !== fetchVersion.current) return;
      setAssets(data.items.map((asset: Asset) => ({ ...asset, path: assetFileUrl(asset) })));
      setHasMore(data.hasMore);
      setBrokenPreviews({});
    } catch (error) {
      if (version === fetchVersion.current) setError(error instanceof Error ? error.message : "Unable to load files.");
    } finally {
      if (version === fetchVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchAssets();
  }, [filter, page, query]);

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
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      if (fileRef.current) fileRef.current.value = "";
      if (page !== 0 || filter !== "All") { setPage(0); setFilter("All"); }
      else await fetchAssets();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset from server storage?")) return;
    try {
      const res = await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to delete file.");
      if (assets.length === 1 && page > 0) setPage(page - 1);
      else await fetchAssets();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to delete file."); }
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

  function isPdfAsset(asset: Asset) {
    return /\.pdf$/i.test(asset.filename) || /\.pdf$/i.test(asset.original_name || "");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Media & Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upload and manage website images, client documents, pet records and booking files.</p>
      </div>

      <div className="rounded-lg border bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_180px_180px_auto]">
          <Input ref={fileRef} type="file" accept="image/*,.pdf" />
          <select value={category} onChange={(e) => { setCategory(e.target.value); setFolder(e.target.value.toLowerCase()); }} className="h-11 rounded-lg border bg-white px-3 text-sm">
            {CATEGORIES.filter((item) => item !== "All").map((item) => <option key={item} value={item}>{item === "General" ? "General images" : item}</option>)}
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

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by file name or notes..."
          aria-label="Search media and documents"
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            onClick={() => { setFilter(item); setPage(0); }}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${filter === item ? "border-primary bg-primary text-white" : "bg-white text-muted-foreground hover:text-foreground"}`}
          >
            {item === "General" ? "General images" : item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : assets.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center">
          <ImagePlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{query ? `Nothing matches "${query}".` : "No media or documents uploaded yet."}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-lg border bg-white">
              <div className="relative aspect-[4/3] bg-muted">
                {isImageAsset(asset) && !brokenPreviews[asset.id] ? (
                  <img
                    src={asset.path}
                    loading="lazy"
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setBrokenPreviews((current) => ({ ...current, [asset.id]: true }))}
                  />
                ) : isPdfAsset(asset) ? (
                  // Non-interactive so the card's own preview button stays in charge of opening the file.
                  <iframe
                    src={`${asset.path}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    title={`Preview of ${asset.original_name}`}
                    loading="lazy"
                    className="pointer-events-none h-full w-full border-0 bg-white"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-4 text-center text-sm font-semibold text-muted-foreground">
                    <ImagePlus className="mb-2 h-8 w-8" />
                    <span>Preview unavailable</span>
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
                  <Button aria-label={`Delete ${asset.original_name}`} size="sm" variant="destructive" onClick={() => deleteAsset(asset.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button aria-label={`Preview ${asset.original_name}`} size="sm" variant="outline" onClick={() => setViewer({ label: asset.original_name, path: assetUrl(asset.path), image: isImageAsset(asset) })}><Eye className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" asChild><a aria-label={`Download ${asset.original_name}`} href={asset.path.startsWith("/api/assets/") ? `${asset.path}?download=1` : assetUrl(asset.path)} download><Download className="h-3.5 w-3.5" /></a></Button>
                  <Button aria-label={`Share ${asset.original_name}`} size="sm" variant="outline" onClick={() => shareAsset(asset.path)}><Share2 className="h-3.5 w-3.5" /></Button>
                  <Button aria-label={`Print ${asset.original_name}`} size="sm" variant="outline" onClick={() => printAsset(asset.path)}><Printer className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" disabled={loading || page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
        <Button variant="outline" disabled={loading} onClick={() => { setError(""); void fetchAssets(); }}>Refresh files</Button>
        <Button variant="outline" disabled={loading || !hasMore} onClick={() => setPage(page + 1)}>Next</Button>
      </div>

      {viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewer(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b p-4">
              <p className="font-bold">{viewer.label}</p>
              <Button size="sm" variant="outline" onClick={() => setViewer(null)}>Close</Button>
            </div>
            {viewer.image ? (
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
