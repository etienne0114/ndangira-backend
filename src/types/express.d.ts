import type { ListingCategory, UserRole } from "@prisma/client";
import type { AuthRole } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: UserRole;
      };
      merchant?: {
        id: string;
        email: string;
        businessName: string;
        ownerName: string;
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
      };
      authRole?: AuthRole;
      authEmail?: string;
    }
  }
}

export {};
