import { mkdir, unlink, writeFile } from "fs/promises";
import { MongoClient, GridFSBucket, ObjectId } from "mongodb";
import path from "path";

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
  return process.env.VERCEL === "1" || process.env.UPLOAD_STORAGE === "gridfs";
}

export async function saveLocalUpload(folder: string, filename: string, buffer: Buffer) {
  const relativePath = `/uploads/${folder}/${filename}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);
  return relativePath;
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

export async function readGridFsUpload(assetId: string) {
  const storage = await bucket();
  const files = await storage.find({ "metadata.assetId": assetId }).sort({ uploadDate: -1 }).limit(1).toArray();
  const file = files[0];
  if (!file) return null;
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = storage.openDownloadStream(file._id as ObjectId);
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return {
    buffer: Buffer.concat(chunks),
    contentType: String(file.metadata?.contentType || "application/octet-stream"),
    filename: file.filename,
  };
}

export async function deleteStoredUpload(assetPath: string, assetId: string) {
  if (assetPath.startsWith("/api/assets/")) {
    const storage = await bucket();
    const files = await storage.find({ "metadata.assetId": assetId }).toArray();
    await Promise.all(files.map((file) => storage.delete(file._id as ObjectId).catch(() => undefined)));
    return;
  }

  const filePath = path.join(process.cwd(), "public", assetPath.replace(/^\//, ""));
  if (filePath.startsWith(path.join(process.cwd(), "public", "uploads"))) {
    await unlink(filePath).catch(() => undefined);
  }
}
