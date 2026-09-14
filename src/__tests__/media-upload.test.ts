import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ session: vi.fn(), create: vi.fn(), save: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { asset: { create: mocks.create } } }));
vi.mock("@/lib/cloudinary", () => ({ uploadToCloudinary: vi.fn() }));
vi.mock("@/lib/upload-storage", () => ({
  shouldUseCloudinaryUploads: () => false, shouldUseGridFsUploads: () => false,
  saveLocalUpload: mocks.save, saveGridFsUpload: vi.fn(),
}));
import { POST } from "@/app/api/upload/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
  mocks.save.mockImplementation(async (folder, filename) => `/uploads/${folder}/${filename}`);
  mocks.create.mockImplementation(async ({ data }) => ({ id: "a".repeat(24), ...data }));
});

it("uploads a general image and registers it for reuse in the media library", async () => {
  const form = new FormData();
  form.set("file", new File([Buffer.from("image")], "New Image.png", { type: "image/png" }));
  form.set("category", "General"); form.set("folder", "general");
  const res = await POST(new NextRequest("http://localhost/api/upload", { method: "POST", body: form }));
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.path).toMatch(/^\/uploads\/general\/new-image-[a-f0-9-]+\.png$/);
  expect(data.category).toBe("General"); expect(data.client_id).toBeNull();
  expect(mocks.save).toHaveBeenCalledOnce(); expect(mocks.create).toHaveBeenCalledOnce();
});

it("rejects oversized requests before reading or storing the file", async () => {
  const res = await POST(new NextRequest("http://localhost/api/upload", { method: "POST", headers: { "content-length": "5000000" } }));
  expect(res.status).toBe(413);
  expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.create).not.toHaveBeenCalled();
});

it("rejects non-image file content types with an image extension", async () => {
  const form = new FormData();
  form.set("file", new File(["test"], "test.png", { type: "text/html" }));
  const res = await POST(new NextRequest("http://localhost/api/upload", { method: "POST", body: form }));
  expect(res.status).toBe(400); expect(mocks.save).not.toHaveBeenCalled();
});
