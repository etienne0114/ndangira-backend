import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const statsRouter = Router();

statsRouter.get("/", async (_request, response, next) => {
  try {
    const [totalListings, totalMerchants, verifiedMerchants, categories, recentListings] =
      await Promise.all([
        prisma.listing.count(),
        prisma.merchant.count(),
        prisma.merchant.count({ where: { verified: true } }),
        prisma.category.findMany({
          orderBy: { label: "asc" },
          include: { _count: { select: { listings: true } } }
        }),
        prisma.listing.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        })
      ]);

    const categoryBreakdown = Object.fromEntries(
      categories.map((c) => [c.name, c._count.listings])
    );

    response.json({
      totalListings,
      totalMerchants,
      verifiedMerchants,
      verificationRate:
        totalMerchants > 0 ? Math.round((verifiedMerchants / totalMerchants) * 100) : 0,
      recentListings,
      categoryBreakdown,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});
