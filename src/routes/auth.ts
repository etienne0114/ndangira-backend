import bcrypt from "bcryptjs";
import { ListingCategory } from "@prisma/client";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env.js";
import { hashPassword, signAdminToken, signMerchantToken, verifyPassword } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireMerchantAuth } from "../middleware/auth.js";
import { notifyNewSellerApplication } from "../utils/notifications.js";

export const authRouter = Router();

// User registration schema (for customers)
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(["SELLER", "CUSTOMER"]).default("CUSTOMER")
});

// Merchant registration schema (for sellers)
const registerMerchantSchema = z.object({
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
  password: z.string().min(1)
});

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

function signToken(user: { id: string; email: string; name: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

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

// User registration (customers)
authRouter.post("/register", async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        name: body.name,
        role: body.role,
        sellerStatus: body.role === "SELLER" ? "PENDING" : null
      }
    });

    // Notify admins if this is a seller registration
    if (body.role === "SELLER") {
      await notifyNewSellerApplication(user.id);
    }

    res.status(201).json({
      token: signToken(user),
      user: { id: user.id, email: user.email, name: user.name, role: user.role, sellerStatus: user.sellerStatus }
    });
  } catch (err) {
    next(err);
  }
});

// Merchant registration (sellers with business details)
authRouter.post("/register-merchant", async (request, response, next) => {
  try {
    const payload = registerMerchantSchema.parse(request.body);

    const existing = await prisma.merchant.findUnique({
      where: { email: payload.email }
    });

    if (existing) {
      response.status(409).json({ message: "A business account with this email already exists." });
      return;
    }

    const passwordHash = await hashPassword(payload.password);
    
    // Destructure to remove password from payload before passing to Prisma
    const { password, ...merchantData } = payload;
    
    const merchant = await prisma.merchant.create({
      data: {
        ...merchantData,
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
      role: "SELLER",
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

// User login
authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    res.json({
      token: signToken(user),
      user: { id: user.id, email: user.email, name: user.name, role: user.role, sellerStatus: user.sellerStatus }
    });
  } catch (err) {
    next(err);
  }
});

// Merchant login
authRouter.post("/login-merchant", async (request, response, next) => {
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
      role: "SELLER",
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

// Get current user
authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, sellerStatus: user.sellerStatus });
  } catch (err) {
    next(err);
  }
});

// Get current merchant
authRouter.get("/me-merchant", requireMerchantAuth, async (request, response) => {
  response.json({
    merchant: request.merchant
  });
});

// Admin login
authRouter.post("/admin-login", async (request, response, next) => {
  try {
    const payload = adminLoginSchema.parse(request.body);

    if (
      payload.email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase() ||
      payload.password !== env.ADMIN_PASSWORD
    ) {
      response.status(401).json({ message: "Invalid admin credentials." });
      return;
    }

    const token = signAdminToken({
      role: "ADMIN",
      email: payload.email.toLowerCase()
    });

    response.json({
      token,
      admin: {
        email: payload.email.toLowerCase(),
        role: "ADMIN"
      }
    });
  } catch (error) {
    next(error);
  }
});
