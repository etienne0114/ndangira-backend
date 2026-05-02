import { InventoryStatus, ListingCategory, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { calculateDistanceKm } from "../utils/distance.js";

const createListingSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.nativeEnum(ListingCategory),
  priceRwf: z.number().int().positive(),
  unitLabel: z.string().min(1),
  inventoryStatus: z.nativeEnum(InventoryStatus).default(InventoryStatus.IN_STOCK),
  isFeatured: z.boolean().optional().default(false),
  freshnessNote: z.string().optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  merchant: z.object({
    businessName: z.string().min(2),
    ownerName: z.string().min(2),
    phone: z.string().min(8),
    whatsapp: z.string().optional(),
    neighborhood: z.string().min(2),
    district: z.string().min(2),
    latitude: z.number(),
    longitude: z.number(),
    verified: z.boolean().optional().default(false)
  })
});

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.nativeEnum(ListingCategory).optional(),
  neighborhood: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  maxDistanceKm: z.coerce.number().positive().optional(),
  sort: z.enum(["distance", "price-asc", "price-desc", "fresh"]).default("distance")
});

type ListingWithMerchant = Prisma.ListingGetPayload<{
  include: { merchant: true };
}>;

function serializeListings(listings: ListingWithMerchant[], lat?: number, lng?: number) {
  return listings.map((listing) => {
    const distanceKm =
      lat !== undefined && lng !== undefined
        ? calculateDistanceKm(lat, lng, listing.merchant.latitude, listing.merchant.longitude)
        : null;

    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      priceRwf: listing.priceRwf,
      unitLabel: listing.unitLabel,
      inventoryStatus: listing.inventoryStatus,
      isFeatured: listing.isFeatured,
      freshnessNote: listing.freshnessNote,
      imageUrl: listing.imageUrl,
      tags: listing.tags,
      createdAt: listing.createdAt,
      merchant: {
        id: listing.merchant.id,
        businessName: listing.merchant.businessName,
        ownerName: listing.merchant.ownerName,
        phone: listing.merchant.phone,
        whatsapp: listing.merchant.whatsapp,
        neighborhood: listing.merchant.neighborhood,
        district: listing.merchant.district,
        latitude: listing.merchant.latitude,
        longitude: listing.merchant.longitude,
        verified: listing.merchant.verified
      },
      distanceKm
    };
  });
}

export const listingsRouter = Router();

listingsRouter.get("/", async (request, response, next) => {
  try {
    const query = searchSchema.parse(request.query);

    const listings = await prisma.listing.findMany({
      where: {
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: "insensitive" } },
                { description: { contains: query.q, mode: "insensitive" } },
                { tags: { has: query.q.toLowerCase() } }
              ]
            }
          : {}),
        ...(query.category ? { category: query.category } : {}),
        ...(query.neighborhood
          ? {
              merchant: {
                neighborhood: { contains: query.neighborhood, mode: "insensitive" }
              }
            }
          : {})
      },
      include: {
        merchant: true
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
    });

    let serialized = serializeListings(listings, query.lat, query.lng);

    const maxDistanceKm = query.maxDistanceKm;

    if (maxDistanceKm !== undefined) {
      serialized = serialized.filter(
        (listing) => listing.distanceKm !== null && listing.distanceKm <= maxDistanceKm
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
        case "distance":
        default:
          return (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER);
      }
    });

    response.json({
      count: serialized.length,
      items: serialized
    });
  } catch (error) {
    next(error);
  }
});

listingsRouter.get("/:id", async (request, response, next) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: request.params.id },
      include: { merchant: true }
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

listingsRouter.post("/", async (request, response, next) => {
  try {
    const payload = createListingSchema.parse(request.body);

    const created = await prisma.listing.create({
      data: {
        title: payload.title,
        description: payload.description,
        category: payload.category,
        priceRwf: payload.priceRwf,
        unitLabel: payload.unitLabel,
        inventoryStatus: payload.inventoryStatus,
        isFeatured: payload.isFeatured,
        freshnessNote: payload.freshnessNote,
        imageUrl: payload.imageUrl,
        tags: payload.tags.map((tag) => tag.toLowerCase()),
        merchant: {
          create: payload.merchant
        }
      },
      include: { merchant: true }
    });

    response.status(201).json(serializeListings([created])[0]);
  } catch (error) {
    next(error);
  }
});
