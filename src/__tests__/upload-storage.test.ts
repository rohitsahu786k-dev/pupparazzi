import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "fs";
import { mkdtemp, mkdir, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { openLocalUpload, saveLocalUpload } from "@/lib/upload-storage";

let fixtureRoot: string | undefined;
afterEach(async () => {
  vi.restoreAllMocks();
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
});

describe("local upload reading", () => {
  it("reads uploads created after startup without depending on public-file discovery", async () => {
    fixtureRoot = await mkdtemp(path.join(tmpdir(), "pupparazzi-storage-test-"));
    vi.spyOn(process, "cwd").mockReturnValue(fixtureRoot);
    const bytes = Buffer.from("local test image");
    const saved = await saveLocalUpload("general", "image.png", bytes);
    expect(saved).toBe("/uploads/general/image.png");
    expect(existsSync(path.join(fixtureRoot, "public", "uploads"))).toBe(false);
    const read = await openLocalUpload(saved);
    expect(Buffer.from(await new Response(read!.body).arrayBuffer())).toEqual(bytes);
    expect(read?.contentType).toBe("image/png");
    expect(read?.length).toBe(bytes.length);
    expect(await openLocalUpload("/uploads/general/missing.png")).toBeNull();
  });
  it("refuses paths outside the upload directory", async () => {
    fixtureRoot = await mkdtemp(path.join(tmpdir(), "pupparazzi-storage-test-"));
    await mkdir(path.join(fixtureRoot, "storage", "uploads"), { recursive: true });
    await writeFile(path.join(fixtureRoot, ".env"), "test-only");
    vi.spyOn(process, "cwd").mockReturnValue(fixtureRoot);
    expect(await openLocalUpload("/uploads/../../.env")).toBeNull();
    expect(await openLocalUpload("/uploads/..\\..\\.env")).toBeNull();
    expect(await openLocalUpload("/.env")).toBeNull();
  });
});
