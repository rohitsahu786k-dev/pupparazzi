import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteStoredUpload } from "@/lib/upload-storage";
import { relatedClientRecordWhere, relatedOldClientHistoryWhere } from "@/lib/client-data-export";

async function deleteAssets(where: Prisma.AssetWhereInput) {
  const assets = await prisma.asset.findMany({ where, select: { id: true, path: true } });
  await Promise.all(assets.map((asset) => deleteStoredUpload(asset.path, asset.id)));
  await prisma.asset.deleteMany({ where });
  return assets.length;
}

export async function deleteBookingCascade(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, select: { id: true } });
  if (!booking) return { deleted: false, assetsDeleted: 0 };

  const assetsDeleted = await deleteAssets({ booking_id: id });
  await prisma.payment.deleteMany({ where: { booking_id: id } });
  await prisma.invoice.deleteMany({ where: { booking_id: id } });
  await prisma.booking.delete({ where: { id } });

  return { deleted: true, assetsDeleted };
}

export async function deleteUserCascade(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, phone: true, email: true } });
  if (!user) return { deleted: false, bookingsDeleted: 0, assetsDeleted: 0, oldHistoriesDeleted: 0, clientRecordsDeleted: 0 };

  const [assignedBookings, pets] = await Promise.all([
    prisma.booking.findMany({ where: { staff_id: id }, select: { id: true } }),
    prisma.pet.findMany({ where: { owner_id: id }, select: { id: true } }),
  ]);
  const petIds = pets.map((pet) => pet.id);
  const bookingsToDelete = await prisma.booking.findMany({
    where: {
      OR: [
        { client_id: id },
        ...(petIds.length ? [{ pet_id: { in: petIds } }] : []),
      ],
    },
    select: { id: true },
  });

  let bookingAssetsDeleted = 0;
  for (const booking of bookingsToDelete) {
    const result = await deleteBookingCascade(booking.id);
    bookingAssetsDeleted += result.assetsDeleted;
  }

  if (assignedBookings.length > 0) {
    await prisma.booking.updateMany({ where: { staff_id: id }, data: { staff_id: null } });
  }

  const profileAssetsDeleted = await deleteAssets({
    OR: [
      { client_id: id },
      ...(petIds.length ? [{ pet_id: { in: petIds } }] : []),
    ],
  });

  await prisma.payment.deleteMany({ where: { client_id: id } });
  await prisma.invoice.deleteMany({ where: { client_id: id } });
  await prisma.notification.deleteMany({ where: { user_id: id } });
  await prisma.staff.deleteMany({ where: { user_id: id } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.account.deleteMany({ where: { userId: id } });
  await prisma.address.deleteMany({ where: { user_id: id } });
  if (petIds.length) {
    await prisma.petMedical.deleteMany({ where: { pet_id: { in: petIds } } });
  }
  await prisma.pet.deleteMany({ where: { owner_id: id } });
  const oldHistoriesDeleted = await prisma.oldClientHistory.deleteMany({ where: relatedOldClientHistoryWhere(user) });
  const clientRecordWhere = relatedClientRecordWhere(user);
  const clientRecordsDeleted = clientRecordWhere
    ? await prisma.clientRecord.deleteMany({ where: clientRecordWhere })
    : { count: 0 };
  await prisma.user.delete({ where: { id } });

  return {
    deleted: true,
    bookingsDeleted: bookingsToDelete.length,
    assetsDeleted: bookingAssetsDeleted + profileAssetsDeleted,
    oldHistoriesDeleted: oldHistoriesDeleted.count,
    clientRecordsDeleted: clientRecordsDeleted.count,
  };
}
