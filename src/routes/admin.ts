import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdminAuth } from "../middleware/auth.js";

const updateSellerStatusSchema = z.object({
  action: z.enum(["verify", "suspend", "reactivate"])
});

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

adminRouter.get("/sellers", async (_request, response, next) => {
  try {
    const sellers = await prisma.merchant.findMany({
      include: {
        _count: {
          select: {
            Listing: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    response.json({
      sellers: sellers.map((seller) => ({
        ...seller,
        status: seller.aiEnabled ? (seller.verified ? "ACTIVE" : "PENDING") : "SUSPENDED",
        listingsCount: seller._count.Listing
      }))
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/sellers/:id/status", async (request, response, next) => {
  try {
    const payload = updateSellerStatusSchema.parse(request.body);
    const seller = await prisma.merchant.update({
      where: { id: request.params.id },
      data:
        payload.action === "verify"
          ? { verified: true, aiEnabled: true }
          : payload.action === "suspend"
            ? { aiEnabled: false }
            : { aiEnabled: true }
    });

    response.json({
      seller,
      status: seller.aiEnabled ? (seller.verified ? "ACTIVE" : "PENDING") : "SUSPENDED"
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
