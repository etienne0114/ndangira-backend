import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { completeChat } from "../lib/openrouter.js";
import { calculateDistanceKm } from "../utils/distance.js";

const aiRequestSchema = z.object({
  message: z.string().min(3),
  lat: z.number().optional(),
  lng: z.number().optional()
});

export const aiRouter = Router();

aiRouter.post("/assistant", async (request, response, next) => {
  try {
    const payload = aiRequestSchema.parse(request.body);

    const nearbyListings = await prisma.listing.findMany({
      include: { merchant: true },
      take: 8,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
    });

    const context = nearbyListings
      .map((listing) => {
        const distance =
          payload.lat !== undefined && payload.lng !== undefined
            ? calculateDistanceKm(
                payload.lat,
                payload.lng,
                listing.merchant.latitude,
                listing.merchant.longitude
              ).toFixed(1)
            : "unknown";

        return `${listing.title} | ${listing.category} | ${listing.priceRwf} RWF | ${listing.merchant.businessName} in ${listing.merchant.neighborhood} | ${distance} km`;
      })
      .join("\n");

    const reply = await completeChat([
      {
        role: "system",
        content:
          "You are Ndangira Concierge, a helpful shopping assistant for Kigali. Recommend nearby options, mention neighborhoods, keep answers concise, and suggest practical next steps for the shopper."
      },
      {
        role: "system",
        content: `Current marketplace context:\n${context}`
      },
      {
        role: "user",
        content: payload.message
      }
    ]);

    response.json({
      reply
    });
  } catch (error) {
    next(error);
  }
});
