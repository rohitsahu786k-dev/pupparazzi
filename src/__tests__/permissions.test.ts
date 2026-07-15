import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPetAccess } from "../lib/reminders/vaccination-service";
import { prisma } from "../lib/prisma";
import { getServerSession } from "next-auth";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    pet: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../lib/auth", () => ({
  authOptions: {},
}));

describe("Permissions and Authorization validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validPetId1 = "60c72b2f9b1d8b2d88888888";
  const validPetId2 = "60c72b2f9b1d8b2d88888889";

  it("allows a client to access their own pet", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "client-123", role: "CLIENT" },
    } as any);

    vi.mocked(prisma.pet.findUnique).mockResolvedValue({
      id: validPetId1,
      owner_id: "client-123",
      name: "Buddy",
    } as any);

    const result = await getPetAccess(validPetId1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("client-123");
      expect(result.role).toBe("CLIENT");
      expect(result.canWrite).toBe(true);
    }
  });

  it("forbids a client from accessing another client's pet", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "client-123", role: "CLIENT" },
    } as any);

    vi.mocked(prisma.pet.findUnique).mockResolvedValue({
      id: validPetId2,
      owner_id: "client-999", // owned by someone else
      name: "Rex",
    } as any);

    const result = await getPetAccess(validPetId2);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.message).toContain("only access your own pet");
    }
  });

  it("allows an admin/staff to access any client's pet", async () => {
    // Staff role
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "staff-123", role: "STAFF" },
    } as any);

    vi.mocked(prisma.pet.findUnique).mockResolvedValue({
      id: validPetId2,
      owner_id: "client-999",
      name: "Rex",
    } as any);

    const result1 = await getPetAccess(validPetId2);
    expect(result1.ok).toBe(true);

    // Admin role
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const result2 = await getPetAccess(validPetId2);
    expect(result2.ok).toBe(true);
  });
});
