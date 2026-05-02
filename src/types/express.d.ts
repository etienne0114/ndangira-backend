import type { ListingCategory } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
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
    }
  }
}

export {};
