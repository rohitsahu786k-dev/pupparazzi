/**
 * Cloudinary upload utility.
 * Uses the server-side Cloudinary SDK for secure uploads.
 */

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  width?: number;
  height?: number;
}

/**
 * Upload a file (base64 or URL) to Cloudinary.
 */
export async function uploadToCloudinary(
  file: string, // base64 data URI or remote URL
  folder: string = process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER || "uploads"
): Promise<CloudinaryUploadResult> {
  const result = await cloudinary.uploader.upload(file, {
    folder,
    resource_type: "auto",
  });

  return {
    public_id: result.public_id,
    secure_url: result.secure_url,
    url: result.url,
    format: result.format,
    resource_type: result.resource_type,
    width: result.width,
    height: result.height,
  };
}

/**
 * Delete an asset from Cloudinary by public_id.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
