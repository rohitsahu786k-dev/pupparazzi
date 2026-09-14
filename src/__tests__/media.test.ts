import { beforeEach, describe, expect, it, vi } from "vitest";
import { isPublicMedia } from "@/lib/media";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), operations: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), read: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/admin", () => ({ requireOperations: mocks.operations }));
vi.mock("@/lib/prisma", () => ({ prisma: { asset: { findMany: mocks.findMany, findUnique: mocks.findUnique }, service: { update: mocks.update } } }));
vi.mock("@/lib/upload-storage", () => ({ openGridFsUpload: mocks.read, openLocalUpload: mocks.read }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));

import { GET as media } from "@/app/api/media/route";
import { GET as file } from "@/app/api/assets/[id]/file/route";
import { PATCH as saveService } from "@/app/api/services/route";

const image = { id: "a".repeat(24), filename: "dog.webp", category: "Services", path: "/uploads/services/dog.webp", original_name: "Dog.webp" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue(null);
  mocks.operations.mockResolvedValue(null);
  mocks.findUnique.mockResolvedValue(image);
  mocks.read.mockResolvedValue({ body: new Blob(["image"]).stream(), contentType: "image/webp", filename: "dog.webp", length: 5 });
});

describe("public media boundaries", () => {
  it("allows website images but never customer documents or linked images", () => {
    expect(isPublicMedia(image)).toBe(true);
    for (const extra of [{ category: "KYC" }, { category: "Pets" }, { filename: "file.pdf" }, { client_id: "client" }, { pet_id: "pet" }, { booking_id: "booking" }, { document_type: "Certificate" }]) {
      expect(isPublicMedia({ ...image, ...extra })).toBe(false);
    }
  });
  it("rejects unauthenticated library requests without querying assets", async () => {
    expect((await media(new Request("http://localhost/api/media"))).status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it("paginates and excludes customer-linked records in the database query", async () => {
    mocks.operations.mockResolvedValue({ user: { role: "STAFF" } });
    mocks.findMany.mockResolvedValue(Array.from({ length: 25 }, (_, i) => ({ ...image, id: String(i) })));
    const res = await media(new Request("http://localhost/api/media?page=1&q=dog"));
    const body = await res.json();
    expect(body.items).toHaveLength(24); expect(body.hasMore).toBe(true);
    const query = mocks.findMany.mock.calls[0][0];
    expect(query.skip).toBe(24); expect(query.take).toBe(25);
    expect(query.where.AND).toHaveLength(5);
    expect(query.where.category.in).toEqual(["Services", "Hero", "General"]);
  });
  it("serves public GridFS images to signed-out visitors", async () => {
    const res = await file(new Request("http://localhost"), { params: Promise.resolve({ id: image.id }) });
    expect(res.status).toBe(200); expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it("answers revalidation with 304 without reading stored bytes", async () => {
    const headers = { "if-none-match": `"asset-${image.id}"` };
    const res = await file(new Request("http://localhost", { headers }), { params: Promise.resolve({ id: image.id }) });
    expect(res.status).toBe(304);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("keeps documents authenticated and prevents shared caching", async () => {
    mocks.findUnique.mockResolvedValue({ ...image, category: "KYC", client_id: "owner" });
    const request = () => file(new Request("http://localhost"), { params: Promise.resolve({ id: image.id }) });
    expect((await request()).status).toBe(401);
    mocks.session.mockResolvedValue({ user: { id: "other", role: "CLIENT" } });
    expect((await request()).status).toBe(403);
    mocks.session.mockResolvedValue({ user: { id: "owner", role: "CLIENT" } });
    expect((await request()).headers.get("Cache-Control")).toBe("private, no-cache");
  });
  it("persists selected image order and invalidates public service pages", async () => {
    mocks.session.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
    mocks.update.mockImplementation(async ({ data }) => ({ id: "service", ...data }));
    const res = await saveService(new Request("http://localhost/api/services", { method: "PATCH", body: JSON.stringify({ id: "service", images_json: "/new.webp\n/existing.png" }) }));
    expect(res.status).toBe(200);
    expect((await res.json()).images_json).toEqual(["/new.webp", "/existing.png"]);
    expect(mocks.revalidate).toHaveBeenCalledWith("/"); expect(mocks.revalidate).toHaveBeenCalledWith("/services");
  });
});
