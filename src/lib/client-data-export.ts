import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function realEmail(value?: string | null) {
  if (!value || value.endsWith("@old-import.local") || value.endsWith("@client.local")) return null;
  return value.toLowerCase();
}

export function relatedOldClientHistoryWhere(user: { id: string; phone?: string | null; email?: string | null }) {
  const or: Prisma.OldClientHistoryWhereInput[] = [{ client_id: user.id }];
  if (user.phone) or.push({ phone: user.phone });
  const email = realEmail(user.email);
  if (email) or.push({ email });
  return { OR: or } satisfies Prisma.OldClientHistoryWhereInput;
}

export function relatedClientRecordWhere(user: { phone?: string | null; email?: string | null }) {
  const or: Prisma.ClientRecordWhereInput[] = [];
  if (user.phone) or.push({ phone: user.phone });
  const email = realEmail(user.email);
  if (email) or.push({ email });
  return or.length ? ({ OR: or } satisfies Prisma.ClientRecordWhereInput) : null;
}

export async function buildClientDataExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      phone: true,
      alt_phone: true,
      role: true,
      wallet_balance: true,
      outstanding_balance: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      accounts: {
        select: {
          id: true,
          type: true,
          provider: true,
          providerAccountId: true,
          expires_at: true,
          token_type: true,
          scope: true,
          session_state: true,
        },
      },
      sessions: { select: { id: true, expires: true } },
      addresses: true,
      pets: { include: { medical: true } },
      clientBookings: {
        include: {
          pet: true,
          service: true,
          address: true,
          staff: { select: { id: true, name: true, email: true, phone: true, role: true } },
          payments: true,
          invoices: true,
        },
      },
      staffBookings: {
        include: {
          client: { select: { id: true, name: true, email: true, phone: true } },
          pet: true,
          service: true,
          address: true,
          payments: true,
          invoices: true,
        },
      },
      payments: true,
      invoices: true,
      staffProfile: true,
      notifications: true,
    },
  });

  if (!user) return null;

  const petIds = user.pets.map((pet) => pet.id);
  const bookingIds = Array.from(new Set([
    ...user.clientBookings.map((booking) => booking.id),
    ...user.staffBookings.map((booking) => booking.id),
  ]));

  const [assets, oldClientHistories, clientRecords] = await Promise.all([
    prisma.asset.findMany({
      where: {
        OR: [
          { client_id: user.id },
          ...(petIds.length ? [{ pet_id: { in: petIds } }] : []),
          ...(bookingIds.length ? [{ booking_id: { in: bookingIds } }] : []),
        ],
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.oldClientHistory.findMany({
      where: relatedOldClientHistoryWhere(user),
      orderBy: { import_date: "desc" },
    }),
    (() => {
      const where = relatedClientRecordWhere(user);
      return where
        ? prisma.clientRecord.findMany({
            where,
            orderBy: { created_at: "desc" },
          })
        : Promise.resolve([]);
    })(),
  ]);

  return {
    exported_at: new Date().toISOString(),
    export_type: "client-delete-backup",
    user,
    assets,
    old_client_histories: oldClientHistories,
    client_records: clientRecords,
  };
}
