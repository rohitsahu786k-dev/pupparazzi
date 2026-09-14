export const PUBLIC_MEDIA_CATEGORIES = ["Services", "Hero", "General"];

export function assetFileUrl(asset: { id: string; path: string }) {
  return asset.path.startsWith("/uploads/") ? `/api/assets/${asset.id}/file` : asset.path;
}

export function isImageFilename(filename: string) {
  return /\.(png|jpe?g|webp|gif)$/i.test(filename);
}

export function isPublicMedia(asset: { category: string; filename: string; client_id?: string | null; pet_id?: string | null; booking_id?: string | null; document_type?: string | null }) {
  return PUBLIC_MEDIA_CATEGORIES.includes(asset.category) && isImageFilename(asset.filename)
    && !asset.client_id && !asset.pet_id && !asset.booking_id && !asset.document_type;
}
