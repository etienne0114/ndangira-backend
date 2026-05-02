import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: params.metadata ?? Prisma.JsonNull
    }
  });
}

export async function createNotificationForAllAdmins(
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Prisma.InputJsonValue
) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true }
  });

  if (admins.length === 0) return [];

  return prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type,
      title,
      message,
      metadata: metadata ?? Prisma.JsonNull
    }))
  });
}

export async function notifySellerApproval(userId: string, approved: boolean) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true }
  });

  if (!user) return null;

  return createNotification({
    userId,
    type: approved ? "SELLER_APPROVED" : "SELLER_REJECTED",
    title: approved ? "Seller Account Approved! 🎉" : "Seller Application Update",
    message: approved
      ? "Congratulations! Your seller account has been approved. You can now create listings and manage your business."
      : "Your seller application has been reviewed. Please contact support for more information.",
    metadata: { approved } as Prisma.InputJsonValue
  });
}

export async function notifyNewSellerApplication(sellerUserId: string) {
  const seller = await prisma.user.findUnique({
    where: { id: sellerUserId },
    select: { name: true, email: true }
  });

  if (!seller) return null;

  return createNotificationForAllAdmins(
    "NEW_SELLER_APPLICATION",
    "New Seller Application",
    `${seller.name} (${seller.email}) has applied to become a seller. Review their application in the admin dashboard.`,
    { sellerUserId, sellerName: seller.name, sellerEmail: seller.email } as Prisma.InputJsonValue
  );
}

export async function notifyListingCreated(listingId: string, merchantId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { merchant: { include: { user: true } } }
  });

  if (!listing || !listing.merchant.user) return null;

  return createNotification({
    userId: listing.merchant.user.id,
    type: "LISTING_CREATED",
    title: "Listing Published Successfully ✓",
    message: `Your listing "${listing.title}" is now live and visible to customers in ${listing.merchant.neighborhood}.`,
    metadata: { listingId, listingTitle: listing.title } as Prisma.InputJsonValue
  });
}

export async function notifyLowStock(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { merchant: { include: { user: true } } }
  });

  if (!listing || !listing.merchant.user) return null;

  return createNotification({
    userId: listing.merchant.user.id,
    type: "LISTING_LOW_STOCK",
    title: "Low Stock Alert ⚠️",
    message: `Your listing "${listing.title}" is marked as LOW_STOCK. Consider restocking or updating the inventory status.`,
    metadata: { listingId, listingTitle: listing.title } as Prisma.InputJsonValue
  });
}
