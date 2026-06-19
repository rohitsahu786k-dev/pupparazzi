import crypto from "crypto";

export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  folder: string,
  mimeType: string
): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are not configured");
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  
  const params = {
    folder,
    timestamp: String(timestamp),
  };

  const sortedKeys = Object.keys(params).sort() as Array<keyof typeof params>;
  const signatureString = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join("&") + apiSecret;

  const signature = crypto
    .createHash("sha1")
    .update(signatureString)
    .digest("hex");

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const formData = new FormData();
  const base64File = `data:${mimeType};base64,${buffer.toString("base64")}`;
  formData.append("file", base64File);
  formData.append("folder", folder);
  formData.append("timestamp", String(timestamp));
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  let secureUrl = data.secure_url;

  // Automatically apply quality and format compression/optimizations for image files
  if (data.resource_type === "image" && secureUrl.includes("/upload/")) {
    secureUrl = secureUrl.replace("/upload/", "/upload/q_auto,f_auto/");
  }

  return secureUrl;
}
