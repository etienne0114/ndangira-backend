import { ListingCategory } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { notifyListingCreated, notifyLowStock } from "../utils/notifications.js";

export const sellerRouter = Router();

sellerRouter.use(requireAuth, requireRole("SELLER"));

// Seller must be approved to manage listings
function requireApproved(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction): void {
  prisma.user
    .findUnique({ where: { id: req.user!.id }, select: { sellerStatus: true } })
    .then((user) => {
      if (!user || user.sellerStatus !== "APPROVED") {
        res.status(403).json({ message: "Your seller account must be approved by an admin first." });
        return;
      }
      next();
    })
    .catch(next);
}

// Get seller's own listings
sellerRouter.get("/listings", async (req, res, next) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { userId: req.user!.id }
    });
    if (!merchant) {
      res.json({ items: [] });
      return;
    }
    const listings = await prisma.listing.findMany({
      where: { merchantId: merchant.id },
      orderBy: { createdAt: "desc" },
      include: { Category: true, Merchant: true }
    });
    res.json({ items: listings });
  } catch (err) {
    next(err);
  }
});

const createListingSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  categoryId: z.string().min(1),
  priceRwf: z.number().int().positive(),
  unitLabel: z.string().min(1),
  inventoryStatus: z.enum(["IN_STOCK", "LOW_STOCK", "MADE_TO_ORDER"]).default("IN_STOCK"),
  isFeatured: z.boolean().default(false),
  freshnessNote: z.string().optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([])
});

// Create a listing (seller must be approved and have a merchant profile)
sellerRouter.post("/listings", requireApproved, async (req, res, next) => {
  try {
    const body = createListingSchema.parse(req.body);
    const { categoryId, ...listingData } = body;
    const merchant = await prisma.merchant.findUnique({ where: { userId: req.user!.id } });
    if (!merchant) {
      res.status(400).json({ message: "Set up your merchant profile before creating listings." });
      return;
    }
    const listing = await prisma.listing.create({
      data: {
        ...listingData,
        Category: { connect: { id: categoryId } },
        Merchant: { connect: { id: merchant.id } }
      },
      include: { Category: true, Merchant: true }
    });
    
    // Send notification to seller
    await notifyListingCreated(listing.id);
    
    // Send low stock notification if applicable
    if (listing.inventoryStatus === "LOW_STOCK") {
      await notifyLowStock(listing.id);
    }
    
    res.status(201).json(listing);
  } catch (err) {
    next(err);
  }
});

// Update a listing
sellerRouter.patch("/listings/:id", requireApproved, async (req, res, next) => {
  try {
    const listingId = String(req.params.id);
    const merchant = await prisma.merchant.findUnique({ where: { userId: req.user!.id } });
    if (!merchant) {
      res.status(404).json({ message: "Merchant profile not found." });
      return;
    }
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, merchantId: merchant.id }
    });
    if (!listing) {
      res.status(404).json({ message: "Listing not found." });
      return;
    }
    const body = createListingSchema.partial().parse(req.body);
    const { categoryId, ...listingData } = body;
    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: categoryId ? { ...listingData, Category: { connect: { id: categoryId } } } : listingData,
      include: { Category: true, Merchant: true }
    });
    
    // Send low stock notification if status changed to LOW_STOCK
    if (body.inventoryStatus === "LOW_STOCK" && listing.inventoryStatus !== "LOW_STOCK") {
      await notifyLowStock(listingId);
    }
    
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete a listing
sellerRouter.delete("/listings/:id", requireApproved, async (req, res, next) => {
  try {
    const listingId = String(req.params.id);
    const merchant = await prisma.merchant.findUnique({ where: { userId: req.user!.id } });
    if (!merchant) {
      res.status(404).json({ message: "Merchant profile not found." });
      return;
    }
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, merchantId: merchant.id }
    });
    if (!listing) {
      res.status(404).json({ message: "Listing not found." });
      return;
    }
    await prisma.listing.delete({ where: { id: listingId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const merchantSchema = z.object({
  businessName: z.string().min(2),
  businessType: z.nativeEnum(ListingCategory),
  phone: z.string().min(6),
  whatsapp: z.string().optional(),
  neighborhood: z.string().min(2),
  district: z.string().min(2),
  latitude: z.number(),
  longitude: z.number()
});

// Create/update merchant profile
sellerRouter.put("/merchant", requireApproved, async (req, res, next) => {
  try {
    const body = merchantSchema.parse(req.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const data = { 
      ...body, 
      ownerName: user.name, 
      userId: req.user!.id,
      email: user.email,
      passwordHash: user.passwordHash
    };
    const existing = await prisma.merchant.findUnique({ where: { userId: req.user!.id } });
    const merchant = existing
      ? await prisma.merchant.update({ where: { userId: req.user!.id }, data })
      : await prisma.merchant.create({ data });
    res.json(merchant);
  } catch (err) {
    next(err);
  }
});

// Get seller's merchant profile
sellerRouter.get("/merchant", async (req, res, next) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { userId: req.user!.id } });
    if (!merchant) {
      res.status(404).json({ message: "No merchant profile yet." });
      return;
    }
    res.json(merchant);
  } catch (err) {
    next(err);
  }
});
