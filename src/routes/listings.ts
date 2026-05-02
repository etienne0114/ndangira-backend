import { InventoryStatus, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { calculateDistanceKm } from "../utils/distance.js";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  categoryId: z.string().optional(),
  neighborhood: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  maxDistanceKm: z.coerce.number().positive().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  inventoryStatus: z.nativeEnum(InventoryStatus).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  sort: z.enum(["distance", "price-asc", "price-desc", "fresh", "newest"]).default("distance"),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0)
});

type ListingWithMerchant = Prisma.ListingGetPayload<{
  include: { Merchant: true; Category: true };
}>;

function serializeListings(listings: ListingWithMerchant[], lat?: number, lng?: number) {
  return listings.map((listing) => {
    const distanceKm =
      lat !== undefined && lng !== undefined
        ? calculateDistanceKm(lat, lng, listing.Merchant.latitude, listing.Merchant.longitude)
        : null;

    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      category: listing.Category.name,
      categoryId: listing.Category.id,
      categoryLabel: listing.Category.label,
      priceRwf: listing.priceRwf,
      unitLabel: listing.unitLabel,
      inventoryStatus: listing.inventoryStatus,
      isFeatured: listing.isFeatured,
      freshnessNote: listing.freshnessNote,
      imageUrl: listing.imageUrl,
      tags: listing.tags,
      createdAt: listing.createdAt,
      merchant: {
        id: listing.Merchant.id,
        businessName: listing.Merchant.businessName,
        ownerName: listing.Merchant.ownerName,
        phone: listing.Merchant.phone,
        whatsapp: listing.Merchant.whatsapp,
        neighborhood: listing.Merchant.neighborhood,
        district: listing.Merchant.district,
        latitude: listing.Merchant.latitude,
        longitude: listing.Merchant.longitude,
        verified: listing.Merchant.verified
      },
      distanceKm
    };
  });
}

export const listingsRouter = Router();

listingsRouter.get("/", async (request, response, next) => {
  try {
    const query = searchSchema.parse(request.query);

    const where: Prisma.ListingWhereInput = {
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { description: { contains: query.q, mode: "insensitive" } },
              { tags: { has: query.q.toLowerCase() } }
            ]
          }
        : {}),
      ...(query.categoryId
        ? { categoryId: query.categoryId }
        : query.category
          ? { Category: { name: { equals: query.category.toUpperCase(), mode: "insensitive" } } }
          : {}),
      ...(query.inventoryStatus ? { inventoryStatus: query.inventoryStatus } : {}),
      ...(query.minPrice || query.maxPrice
        ? {
            priceRwf: {
              ...(query.minPrice ? { gte: query.minPrice } : {}),
              ...(query.maxPrice ? { lte: query.maxPrice } : {})
            }
          }
        : {}),
      ...(query.neighborhood
        ? {
            Merchant: {
              neighborhood: { contains: query.neighborhood, mode: "insensitive" },
              ...(query.verifiedOnly ? { verified: true } : {})
            }
          }
        : query.verifiedOnly
          ? { Merchant: { verified: true } }
          : {})
    };

    const total = await prisma.listing.count({ where });

    const listings = await prisma.listing.findMany({
      where,
      include: {
        Merchant: true,
        Category: true
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: query.limit,
      skip: query.offset
    });

    let serialized = serializeListings(listings, query.lat, query.lng);

    if (query.maxDistanceKm !== undefined) {
      serialized = serialized.filter(
        (listing) => listing.distanceKm !== null && listing.distanceKm <= query.maxDistanceKm!
      );
    }

    serialized.sort((a, b) => {
      switch (query.sort) {
        case "price-asc":
          return a.priceRwf - b.priceRwf;
        case "price-desc":
          return b.priceRwf - a.priceRwf;
        case "fresh":
          return Number(Boolean(b.freshnessNote)) - Number(Boolean(a.freshnessNote));
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER);
      }
    });

    response.json({
      items: serialized,
      total,
      limit: query.limit,
      offset: query.offset,
      hasMore: query.offset + query.limit < total
    });
  } catch (error) {
    next(error);
  }
});

listingsRouter.get("/:id", async (request, response, next) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: request.params.id },
      include: { Merchant: true, Category: true }
    });

    if (!listing) {
      response.status(404).json({ message: "Listing not found." });
      return;
    }

    response.json(serializeListings([listing])[0]);
  } catch (error) {
    next(error);
  }
});

// REMOVED: This endpoint was a security vulnerability that allowed unauthenticated listing creation
// Use POST /api/merchant/listings instead (requires authentication)
