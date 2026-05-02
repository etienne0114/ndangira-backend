import { InventoryStatus, ListingCategory } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireMerchantAuth } from "../middleware/auth.js";

const updateLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  neighborhood: z.string().min(2),
  district: z.string().min(2),
  addressLine: z.string().optional(),
  serviceRadiusKm: z.number().int().positive().max(50).optional()
});

const createMerchantListingSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.nativeEnum(ListingCategory),
  priceRwf: z.number().int().positive(),
  unitLabel: z.string().min(1),
  inventoryStatus: z.nativeEnum(InventoryStatus).default(InventoryStatus.IN_STOCK),
  freshnessNote: z.string().optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  isFeatured: z.boolean().optional().default(false)
});

export const merchantRouter = Router();

merchantRouter.use(requireMerchantAuth);

merchantRouter.get("/dashboard", async (request, response, next) => {
  try {
    const merchantId = request.merchant!.id;
    const [merchant, listings] = await Promise.all([
      prisma.merchant.findUnique({
        where: { id: merchantId },
        select: {
          id: true,
          businessName: true,
          ownerName: true,
          email: true,
          phone: true,
          whatsapp: true,
          businessType: true,
          neighborhood: true,
          district: true,
          addressLine: true,
          description: true,
          latitude: true,
          longitude: true,
          serviceRadiusKm: true,
          verified: true,
          aiEnabled: true,
          createdAt: true
        }
      }),
      prisma.listing.findMany({
        where: { merchantId },
        orderBy: { createdAt: "desc" }
      })
    ]);

    response.json({
      merchant,
      listings,
      metrics: {
        totalListings: listings.length,
        inStock: listings.filter((listing) => listing.inventoryStatus === "IN_STOCK").length,
        lowStock: listings.filter((listing) => listing.inventoryStatus === "LOW_STOCK").length,
        featured: listings.filter((listing) => listing.isFeatured).length
      }
    });
  } catch (error) {
    next(error);
  }
});

merchantRouter.patch("/location", async (request, response, next) => {
  try {
    const payload = updateLocationSchema.parse(request.body);
    const merchant = await prisma.merchant.update({
      where: { id: request.merchant!.id },
      data: payload,
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        email: true,
        phone: true,
        whatsapp: true,
        businessType: true,
        neighborhood: true,
        district: true,
        addressLine: true,
        description: true,
        latitude: true,
        longitude: true,
        serviceRadiusKm: true,
        verified: true,
        aiEnabled: true
      }
    });

    response.json({ merchant });
  } catch (error) {
    next(error);
  }
});

merchantRouter.post("/listings", async (request, response, next) => {
  try {
    const payload = createMerchantListingSchema.parse(request.body);
    const merchant = request.merchant!;
    const created = await prisma.listing.create({
      data: {
        ...payload,
        merchantId: merchant.id,
        tags: payload.tags.map((tag) => tag.toLowerCase())
      }
    });

    response.status(201).json({
      listing: created,
      merchant
    });
  } catch (error) {
    next(error);
  }
});
