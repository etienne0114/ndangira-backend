import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { verifyMerchantToken } from "../lib/auth.js";

export async function requireMerchantAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      response.status(401).json({ message: "Authentication required." });
      return;
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const payload = verifyMerchantToken(token);
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
    next();
  } catch (error) {
    response.status(401).json({ message: "Invalid or expired session." });
  }
}
