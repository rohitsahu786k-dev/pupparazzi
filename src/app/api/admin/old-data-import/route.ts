import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { OLD_DATA_DEFAULT_ROOT, previewOldDataImport, runOldDataImport } from "@/lib/old-data-import";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit") || 25)));

  if (profileId) {
    const profile = await prisma.oldClientHistory.findUnique({ where: { id: profileId } });
    if (!profile) return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    return NextResponse.json(profile);
  }

  if (searchParams.get("jobs") === "true") {
    const jobs = await prisma.oldDataImportJob.findMany({ orderBy: { created_at: "desc" }, take: 10 });
    return NextResponse.json({ jobs });
  }

  const where: Prisma.OldClientHistoryWhereInput = q ? {
    OR: [
      { client_name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ],
  } : {};
  const [profiles, total, latestJob] = await Promise.all([
    prisma.oldClientHistory.findMany({
      where,
      orderBy: [{ import_date: "desc" }, { client_name: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        client_name: true,
        phone: true,
        email: true,
        address: true,
        pet_names_json: true,
        summary_json: true,
        source: true,
        import_date: true,
      },
    }),
    prisma.oldClientHistory.count({ where }),
    prisma.oldDataImportJob.findFirst({ orderBy: { created_at: "desc" } }),
  ]);
  return NextResponse.json({ profiles, total, page, limit, totalPages: Math.ceil(total / limit), latestJob });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ message: "Admin access required" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const mode = String(body.mode || "preview");
  const root = String(body.root || OLD_DATA_DEFAULT_ROOT);

  try {
    if (mode === "preview") {
      const summary = await previewOldDataImport(root);
      const job = await prisma.oldDataImportJob.create({
        data: {
          source_path: root,
          mode: "Preview",
          status: "Preview Ready",
          summary_json: summary as Prisma.InputJsonValue,
          created_by: session.user.id,
        },
      });
      return NextResponse.json({ jobId: job.id, summary });
    }

    if (mode === "import") {
      const result = await runOldDataImport({
        root,
        createdBy: session.user.id,
        importPdfs: body.importPdfs !== false,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ message: "Invalid mode" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { message: "Old data import failed", error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
