"use client";

import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_UPLOAD_FILE_SIZE_BYTES, UPLOAD_SIZE_ERROR_MESSAGE } from "@/lib/upload-limits";
import { assetFileUrl } from "@/lib/media";

type Media = { id: string; original_name: string; path: string };
type Props = { value: string[]; onChange: (images: string[]) => void; category?: string; multiple?: boolean; label?: string; disabled?: boolean; onBusyChange?: (busy: boolean) => void };

export function MediaPicker({ value, onChange, category = "General", multiple = false, label = "Image", disabled = false, onBusyChange }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Media[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/media?q=${encodeURIComponent(query)}&page=${page}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Unable to load media. Try again.");
        const data = await res.json();
        setItems(data.items); setHasMore(data.hasMore); setError("");
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load media.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, query, page, retry]);

  function select(path: string) {
    const current = latest.current;
    current.onChange(multiple ? [...new Set([...current.value, path])] : [path]);
    setOpen(false);
  }

  async function upload(file?: File) {
    if (!file) return;
    setError("");
    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) { setError(UPLOAD_SIZE_ERROR_MESSAGE); return; }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) { setError("Choose a JPG, PNG, WebP or GIF image."); return; }
    setUploading(true); onBusyChange?.(true);
    try {
      const data = new FormData(); data.set("file", file); data.set("category", category); data.set("folder", category.toLowerCase());
      const res = await fetch("/api/upload", { method: "POST", body: data });
      const result = await res.json();
      if (!res.ok || !result.path) throw new Error(result.error || "Upload failed. Please retry.");
      select(assetFileUrl(result));
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
    finally { setUploading(false); onBusyChange?.(false); }
  }

  return <div className="min-w-0 space-y-3 rounded-xl border bg-white p-3">
    <p className="text-sm font-semibold">{label}</p>
    {value.length > 0 && <div className="flex flex-wrap gap-3">{value.map((src, index) => <div key={src} className="w-28 space-y-1">
      <img src={src} alt={`${label} ${index + 1}`} loading="lazy" className="aspect-[4/3] w-full rounded-lg border bg-muted object-contain" />
      <div className="flex flex-wrap gap-1">
        {multiple && index > 0 && <button type="button" disabled={disabled || uploading} className="text-xs text-primary underline" onClick={() => onChange([src, ...value.filter((p) => p !== src)])}>Make cover</button>}
        <button type="button" disabled={disabled || uploading} className="text-xs text-red-600 underline" onClick={() => onChange(value.filter((p) => p !== src))}>Remove</button>
      </div>
      {multiple && index === 0 && <span className="text-xs text-muted-foreground">Cover image</span>}
    </div>)}</div>}
    <div className="flex flex-wrap gap-2">
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" aria-label={`Upload ${label}`} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
      <Button type="button" size="sm" variant="outline" disabled={disabled || uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Uploading…" : "Upload image"}</Button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild><Button type="button" size="sm" variant="outline" disabled={disabled || uploading}>Choose from media</Button></Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3"><Dialog.Title className="text-lg font-bold">Choose an image</Dialog.Title><Dialog.Close asChild><Button type="button" size="sm" variant="outline">Close</Button></Dialog.Close></div>
            <Dialog.Description className="text-sm text-muted-foreground">Website images from Services, Hero and General. Client documents stay separate.</Dialog.Description>
            <Input aria-label="Search media" placeholder="Search images by name…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
            {error && <div role="alert" className="text-sm text-red-600">{error} <button type="button" className="underline" onClick={() => setRetry((n) => n + 1)}>Retry</button></div>}
            <div className="min-h-32 overflow-y-auto">
              {loading ? <p role="status">Loading images…</p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{items.map((item) => <button key={item.id} type="button" onClick={() => select(item.path)} className="min-w-0 rounded-lg border p-2 text-left hover:border-primary focus-visible:ring-2 focus-visible:ring-primary">
                <img src={item.path} alt="" loading="lazy" className="aspect-square w-full rounded-md bg-muted object-cover" />
                <span className="mt-2 block truncate text-xs">{item.original_name}</span>
              </button>)}</div>}
              {!loading && !error && !items.length && <p className="text-sm text-muted-foreground">No matching images. Upload a new image to add it to the library.</p>}
            </div>
            <div className="flex items-center justify-between"><Button type="button" size="sm" variant="outline" disabled={loading || page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-xs">Page {page + 1}</span><Button type="button" size="sm" variant="outline" disabled={loading || !hasMore} onClick={() => setPage(page + 1)}>Next</Button></div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
    <p className="text-xs text-muted-foreground">JPG, PNG, WebP or GIF · up to 2 MB. Save the form to publish your selection.</p>
    {error && !open && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </div>;
}
