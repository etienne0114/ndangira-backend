import { ListingCategory } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { hashPassword, signMerchantToken, verifyPassword } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { requireMerchantAuth } from "../middleware/auth.js";

const registerSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(8),
  whatsapp: z.string().optional(),
  businessType: z.nativeEnum(ListingCategory),
  neighborhood: z.string().min(2),
  district: z.string().min(2),
  addressLine: z.string().optional(),
  description: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  serviceRadiusKm: z.number().int().positive().max(50).default(5)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

function serializeMerchant(merchant: {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  whatsapp: string | null;
  businessType: ListingCategory;
  neighborhood: string;
  district: string;
  addressLine: string | null;
  description: string | null;
  latitude: number;
  longitude: number;
  serviceRadiusKm: number;
  verified: boolean;
  aiEnabled: boolean;
}) {
  return merchant;
}

export const authRouter = Router();

authRouter.post("/register", async (request, response, next) => {
  try {
    const payload = registerSchema.parse(request.body);

    const existing = await prisma.merchant.findUnique({
      where: { email: payload.email }
    });

    if (existing) {
      response.status(409).json({ message: "A business account with this email already exists." });
      return;
    }

    const passwordHash = await hashPassword(payload.password);
    const merchant = await prisma.merchant.create({
      data: {
        ...payload,
        email: payload.email.toLowerCase(),
        passwordHash
      },
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

    const token = signMerchantToken({
      merchantId: merchant.id,
      email: merchant.email
    });

    response.status(201).json({
      token,
      merchant: serializeMerchant(merchant)
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (request, response, next) => {
  try {
    const payload = loginSchema.parse(request.body);
    const merchant = await prisma.merchant.findUnique({
      where: { email: payload.email.toLowerCase() }
    });

    if (!merchant) {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const valid = await verifyPassword(payload.password, merchant.passwordHash);
    if (!valid) {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const token = signMerchantToken({
      merchantId: merchant.id,
      email: merchant.email
    });

    response.json({
      token,
      merchant: serializeMerchant(merchant)
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireMerchantAuth, async (request, response) => {
  response.json({
    merchant: request.merchant
  });
});
