import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const statsRouter = Router();

statsRouter.get("/", async (_request, response, next) => {
  try {
    const [
      totalListings,
      totalMerchants,
      verifiedMerchants,
      categoryCounts,
      recentListings
    ] = await Promise.all([
      prisma.listing.count(),
      prisma.merchant.count(),
      prisma.merchant.count({ where: { verified: true } }),
      prisma.listing.groupBy({
        by: ["category"],
        _count: true
      }),
      prisma.listing.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    const categoryBreakdown = categoryCounts.reduce(
      (acc, item) => {
        acc[item.category] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    response.json({
      totalListings,
      totalMerchants,
      verifiedMerchants,
      verificationRate: totalMerchants > 0 
        ? Math.round((verifiedMerchants / totalMerchants) * 100) 
        : 0,
      recentListings,
      categoryBreakdown,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});
