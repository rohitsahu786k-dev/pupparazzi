import { createReadStream } from "fs";
import { mkdir, unlink, writeFile, realpath, stat } from "fs/promises";
import { MongoClient, GridFSBucket, ObjectId } from "mongodb";
import path from "path";
import { Readable } from "stream";

const globalForMongo = globalThis as unknown as { uploadMongoClient?: MongoClient };

function mongoDatabaseName() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for GridFS uploads");
  const parsed = new URL(url);
  const name = parsed.pathname.replace(/^\//, "");
  if (!name) throw new Error("DATABASE_URL must include a database name for GridFS uploads");
  return decodeURIComponent(name);
}

async function mongoClient() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for uploads");
  if (!globalForMongo.uploadMongoClient) {
    globalForMongo.uploadMongoClient = new MongoClient(process.env.DATABASE_URL);
  }
  await globalForMongo.uploadMongoClient.connect();
  return globalForMongo.uploadMongoClient;
}

async function bucket() {
  const client = await mongoClient();
  return new GridFSBucket(client.db(mongoDatabaseName()), { bucketName: "assetUploads" });
}

export function shouldUseGridFsUploads() {
  return process.env.UPLOAD_STORAGE
    ? process.env.UPLOAD_STORAGE === "gridfs"
    : process.env.VERCEL === "1";
}

export function shouldUseCloudinaryUploads() {
  return process.env.UPLOAD_STORAGE === "cloudinary";
}

// Kept out of public/ so Next never serves customer documents as static files,
// which would bypass the authorization in /api/assets/[id]/file.
function localUploadRoot() {
  return path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "storage", "uploads"));
}

export async function saveLocalUpload(folder: string, filename: string, buffer: Buffer) {
  const relativePath = `/uploads/${folder}/${filename}`;
  const uploadDir = path.join(localUploadRoot(), folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return relativePath;
}

export type StoredUpload = { body: ReadableStream<Uint8Array>; contentType: string; filename: string; length: number };

const CONTENT_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf" };

export async function openLocalUpload(assetPath: string): Promise<StoredUpload | null> {
  if (!assetPath.startsWith("/uploads/")) return null;
  const root = localUploadRoot();
  const target = path.resolve(root, assetPath.slice("/uploads/".length));
  if (!target.startsWith(root + path.sep)) return null;
  try {
    const [realRoot, realTarget] = await Promise.all([realpath(root), realpath(target)]);
    if (!realTarget.startsWith(realRoot + path.sep)) return null;
    const stats = await stat(realTarget);
    if (!stats.isFile()) return null;
    return {
      body: Readable.toWeb(createReadStream(realTarget)) as ReadableStream<Uint8Array>,
      contentType: CONTENT_TYPES[path.extname(target).toLowerCase()] || "application/octet-stream",
      filename: path.basename(target),
      length: stats.size,
    };
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes((error as NodeJS.ErrnoException).code || "")) return null;
    throw error;
  }
}

export async function saveGridFsUpload(params: {
  assetId: string;
  filename: string;
  originalName: string;
  contentType: string;
  buffer: Buffer;
}) {
  const storage = await bucket();
  await new Promise<void>((resolve, reject) => {
    const stream = storage.openUploadStream(params.filename, {
      metadata: {
        assetId: params.assetId,
        originalName: params.originalName,
        contentType: params.contentType,
      },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(params.buffer);
  });
  return `/api/assets/${params.assetId}/file`;
}

export async function openGridFsUpload(assetId: string): Promise<StoredUpload | null> {
  const storage = await bucket();
  const files = await storage.find({ "metadata.assetId": assetId }).sort({ uploadDate: -1 }).limit(1).toArray();
  const file = files[0];
  if (!file) return null;
  return {
    body: Readable.toWeb(storage.openDownloadStream(file._id as ObjectId)) as ReadableStream<Uint8Array>,
    contentType: String(file.metadata?.contentType || "application/octet-stream"),
    filename: file.filename,
    length: file.length,
  };
}

export async function deleteStoredUpload(assetPath: string, assetId: string) {
  if (assetPath.startsWith("/api/assets/")) {
    const storage = await bucket();
    const files = await storage.find({ "metadata.assetId": assetId }).toArray();
    await Promise.all(files.map((file) => storage.delete(file._id as ObjectId).catch(() => undefined)));
    return;
  }

  if (!assetPath.startsWith("/uploads/")) return;
  const root = localUploadRoot();
  const filePath = path.resolve(root, assetPath.slice("/uploads/".length));
  if (filePath.startsWith(root + path.sep)) {
    await unlink(filePath).catch(() => undefined);
  }
}
