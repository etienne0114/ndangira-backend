import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { verifyAuthToken } from "../lib/auth.js";

interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

function extractToken(request: Request) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "").trim();
}

// User-based authentication (for admin and user routes)
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role as import("@prisma/client").UserRole
    };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token." });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "Insufficient permissions." });
      return;
    }
    next();
  };
}

// Merchant-based authentication (for merchant routes)
export async function requireMerchantAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const token = extractToken(request);
    if (!token) {
      response.status(401).json({ message: "Authentication required." });
      return;
    }

    const payload = verifyAuthToken(token);
    if (payload.role !== "SELLER") {
      response.status(403).json({ message: "Seller access required." });
      return;
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: payload.merchantId },
      select: {
        id: true,
        email: true,
        businessName: true,
        ownerName: true,
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

    if (!merchant) {
      response.status(401).json({ message: "Merchant account not found." });
      return;
    }

    request.merchant = merchant;
    request.authRole = payload.role;
    request.authEmail = payload.email;
    next();
  } catch (error) {
    response.status(401).json({ message: "Invalid or expired session." });
  }
}

// Admin authentication (for admin routes)
export async function requireAdminAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const token = extractToken(request);
    if (!token) {
      response.status(401).json({ message: "Authentication required." });
      return;
    }

    const payload = verifyAuthToken(token);
    if (payload.role !== "ADMIN") {
      response.status(403).json({ message: "Admin access required." });
      return;
    }

    request.authRole = payload.role;
    request.authEmail = payload.email;
    next();
  } catch {
    response.status(401).json({ message: "Invalid or expired token." });
  }
}
