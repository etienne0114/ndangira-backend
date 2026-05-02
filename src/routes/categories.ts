import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

/** Normalize a human label into a stable UPPER_SNAKE_CASE name. */
function toName(label: string): string {
  return label.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
}

const createCategorySchema = z.object({
  label: z.string().min(2).max(60)
});

export const categoriesRouter = Router();

function requireApprovedSellerOrAdmin(
  request: import("express").Request,
  response: import("express").Response,
  next: import("express").NextFunction
): void {
  if (request.user?.role === "ADMIN") {
    next();
    return;
  }

  prisma.user
    .findUnique({ where: { id: request.user!.id }, select: { sellerStatus: true } })
    .then((user) => {
      if (!user || user.sellerStatus !== "APPROVED") {
        response.status(403).json({ message: "Your seller account must be approved before creating categories." });
        return;
      }
      next();
    })
    .catch(next);
}

/**
 * GET /api/categories
 * Returns all categories ordered: system first, then custom alphabetically.
 * Each item includes a live listing count.
 */
categoriesRouter.get("/", async (_request, response, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ isSystem: "desc" }, { label: "asc" }],
      include: {
        _count: {
          select: {
            Listing: {
              where: { Merchant: { User: { role: "SELLER", sellerStatus: "APPROVED" } } }
            }
          }
        }
      }
    });

    response.json({
      items: categories.map((c) => ({
        id:           c.id,
        name:         c.name,
        label:        c.label,
        isSystem:     c.isSystem,
        listingCount: c._count.Listing,
        createdAt:    c.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories
 * Body: { "label": "Fresh Organic Food" }
 *
 * Idempotent: if the normalized name already exists it returns 200 with
 * { ...category, created: false }.  A genuinely new category returns 201
 * with { ...category, created: true }.
 *
 * System categories (GROCERIES, HOME, …) are never duplicated — the same
 * idempotency rule applies.
 */
categoriesRouter.post(
  "/",
  requireAuth,
  requireRole("ADMIN", "SELLER"),
  requireApprovedSellerOrAdmin,
  async (request, response, next) => {
  try {
    const { label } = createCategorySchema.parse(request.body);
    const name = toName(label);

    if (!name) {
      response.status(400).json({
        message: "The provided label produces an empty normalized name. Use letters, numbers, or spaces."
      });
      return;
    }

    const existing = await prisma.category.findUnique({ where: { name } });

    if (existing) {
      response.status(200).json({
        id:        existing.id,
        name:      existing.name,
        label:     existing.label,
        isSystem:  existing.isSystem,
        createdAt: existing.createdAt,
        created:   false
      });
      return;
    }

    const created = await prisma.category.create({
      data: { name, label: label.trim(), isSystem: false }
    });

    response.status(201).json({
      id:        created.id,
      name:      created.name,
      label:     created.label,
      isSystem:  created.isSystem,
      createdAt: created.createdAt,
      created:   true
    });
  } catch (error) {
    next(error);
  }
});
