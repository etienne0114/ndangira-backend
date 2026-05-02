import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { notifySellerApproved, notifySellerRejected } from "../utils/notifications.js";

export const adminRouter = Router();

adminRouter.use(requireAdminAuth);

adminRouter.get("/overview", async (_request, response, next) => {
  try {
    const [
      totalListings,
      totalMerchants,
      activeSellers,
      pendingSellers,
      suspendedSellers,
      recentListings,
      newSellers
    ] = await Promise.all([
      prisma.listing.count(),
      prisma.merchant.count(),
      prisma.merchant.count({ where: { verified: true, aiEnabled: true } }),
      prisma.merchant.count({ where: { verified: false, aiEnabled: true } }),
      prisma.merchant.count({ where: { aiEnabled: false } }),
      prisma.listing.findMany({
        include: { Merchant: true },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.merchant.findMany({
        orderBy: { createdAt: "desc" },
        take: 6
      })
    ]);

    response.json({
      stats: {
        totalListings,
        totalMerchants,
        activeSellers,
        pendingSellers,
        suspendedSellers
      },
      recentListings,
      newSellers
    });
  } catch (error) {
    next(error);
  }
});

// Get all sellers (User-based seller management)
adminRouter.get("/sellers", async (_request, response, next) => {
  try {
    const sellers = await prisma.user.findMany({
      where: { role: "SELLER" },
      include: {
        Merchant: {
          select: {
            id: true,
            businessName: true,
            neighborhood: true,
            district: true,
            verified: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    response.json({
      items: sellers.map((seller) => ({
        id: seller.id,
        email: seller.email,
        name: seller.name,
        sellerStatus: seller.sellerStatus,
        createdAt: seller.createdAt,
        merchant: seller.Merchant
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get all platform users
adminRouter.get("/users", async (_request, response, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        sellerStatus: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    response.json({
      items: users
    });
  } catch (error) {
    next(error);
  }
});

// Approve seller
adminRouter.patch("/sellers/:id/approve", async (request, response, next) => {
  try {
    const seller = await prisma.user.update({
      where: { id: request.params.id },
      data: { sellerStatus: "APPROVED" },
      include: {
        Merchant: {
          select: {
            id: true,
            businessName: true,
            neighborhood: true,
            district: true,
            verified: true
          }
        }
      }
    });

    // Send notification to seller
    await notifySellerApproved(seller.id);

    response.json({
      id: seller.id,
      email: seller.email,
      name: seller.name,
      sellerStatus: seller.sellerStatus,
      merchant: seller.Merchant
    });
  } catch (error) {
    next(error);
  }
});

// Reject seller
adminRouter.patch("/sellers/:id/reject", async (request, response, next) => {
  try {
    const seller = await prisma.user.update({
      where: { id: request.params.id },
      data: { sellerStatus: "REJECTED" },
      include: {
        Merchant: {
          select: {
            id: true,
            businessName: true,
            neighborhood: true,
            district: true,
            verified: true
          }
        }
      }
    });

    // Send notification to seller
    await notifySellerRejected(seller.id);

    response.json({
      id: seller.id,
      email: seller.email,
      name: seller.name,
      sellerStatus: seller.sellerStatus,
      merchant: seller.Merchant
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/listings", async (_request, response, next) => {
  try {
    const listings = await prisma.listing.findMany({
      include: { Merchant: true },
      orderBy: { createdAt: "desc" }
    });

    response.json({ listings });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/listings/:id", async (request, response, next) => {
  try {
    await prisma.listing.delete({
      where: { id: request.params.id }
    });

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});
