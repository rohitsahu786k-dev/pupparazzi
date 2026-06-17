export const MAX_UPLOAD_FILE_SIZE_MB = 2;
export const MAX_UPLOAD_FILE_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024;
export const FILE_COMPRESSOR_URL = "https://imagecompressor.com/";
export const UPLOAD_SIZE_ERROR_MESSAGE =
  "File size is too large. Please upload a file up to 2 MB only. You can reduce your document size using this link: https://imagecompressor.com/";

export function isUploadTooLarge(file?: { size: number } | null) {
  return Boolean(file && file.size > MAX_UPLOAD_FILE_SIZE_BYTES);
}
