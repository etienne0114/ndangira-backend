import { Router } from "express";
import { ListingCategory } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { completeChat } from "../lib/openrouter.js";
import { calculateDistanceKm } from "../utils/distance.js";

const aiRequestSchema = z.object({
  message: z.string().min(3).max(500),
  lat: z.number().optional(),
  lng: z.number().optional(),
  conversationId: z.string().optional()
});

export const aiRouter = Router();

aiRouter.post("/assistant", async (request, response, next) => {
  try {
    const payload = aiRequestSchema.parse(request.body);

    const allListings = await prisma.listing.findMany({
      include: { merchant: true },
      take: 24,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
    });

    let nearbyListings = allListings;
    if (payload.lat !== undefined && payload.lng !== undefined) {
      nearbyListings = allListings
        .map((listing) => ({
          ...listing,
          distance: calculateDistanceKm(
            payload.lat!,
            payload.lng!,
            listing.merchant.latitude,
            listing.merchant.longitude
          )
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 12);
    }

    const context = nearbyListings
      .map((listing) => {
        const listingWithDistance = listing as typeof listing & { distance?: number };
        const distance =
          listingWithDistance.distance !== undefined
            ? `${listingWithDistance.distance.toFixed(1)} km away`
            : "distance unknown";

        const freshness = listing.freshnessNote ? ` | Fresh: ${listing.freshnessNote}` : "";
        const stock = listing.inventoryStatus !== "IN_STOCK" ? ` | ${listing.inventoryStatus}` : "";
        const verified = listing.merchant.verified ? " | ✓ Verified" : "";

        return `• ${listing.title} - ${listing.priceRwf.toLocaleString()} RWF ${listing.unitLabel} | ${listing.category} | ${listing.merchant.businessName} in ${listing.merchant.neighborhood} | ${distance}${freshness}${stock}${verified}`;
      })
      .join("\n");

    const lowerMessage = payload.message.toLowerCase();
    const categoryInsights = buildCategoryInsights(nearbyListings);
    const priceComparison = buildPriceComparison(lowerMessage, nearbyListings);
    const neighborhoodHighlights = buildNeighborhoodHighlights(nearbyListings);

    const systemPrompt = `You are Ndangira Concierge, an expert shopping assistant for Kigali, Rwanda.

Your role:
- Help shoppers find nearby products and services
- Provide practical recommendations based on location, price, and quality
- Suggest alternatives and comparisons
- Compare prices when there are multiple relevant options
- Keep responses conversational, helpful, and concise
- Structure answers with a short recommendation, then 2-4 bullet-style lines in plain text if comparing choices
- Always mention specific merchant names, neighborhoods, and distances when available
- Highlight verified merchants, freshness notes, and low-stock urgency
- If a user seems budget-focused, point out the lowest price and best value choice
- If no exact match exists, explain the closest alternatives honestly
- End with one practical next step or follow-up question

Current marketplace inventory:
${context}

Category insights:
${categoryInsights}

Price insights:
${priceComparison}

Neighborhood insights:
${neighborhoodHighlights}`;

    const reply = await completeChat([
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: payload.message
      }
    ]);

    const suggestions = generateSuggestions(payload.message, nearbyListings);
    const relatedListings = rankRelevantListings(payload.message, nearbyListings).slice(0, 4).map((listing) => {
      const listingWithDistance = listing as typeof listing & { distance?: number };
      return {
        id: listing.id,
        title: listing.title,
        priceRwf: listing.priceRwf,
        merchant: listing.merchant.businessName,
        neighborhood: listing.merchant.neighborhood,
        distance: listingWithDistance.distance ?? null,
        category: listing.category,
        unitLabel: listing.unitLabel,
        inventoryStatus: listing.inventoryStatus,
        freshnessNote: listing.freshnessNote ?? null,
        verified: listing.merchant.verified
      };
    });

    response.json({
      reply,
      suggestions,
      relatedListings,
      conversationId: payload.conversationId || `conv_${Date.now()}`
    });
  } catch (error) {
    next(error);
  }
});

function normalizeCategory(category: string) {
  return category.toLowerCase().replace(/_/g, " ");
}

function buildCategoryInsights(listings: any[]) {
  const counts = new Map<ListingCategory, number>();

  for (const listing of listings) {
    counts.set(listing.category, (counts.get(listing.category) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return "No category insights available.";
  }

  return Array.from(counts.entries())
    .map(([category, count]) => `${normalizeCategory(category)}: ${count} options`)
    .join("\n");
}

function buildPriceComparison(message: string, listings: any[]) {
  const ranked = rankRelevantListings(message, listings);
  const candidates = ranked.slice(0, 5);

  if (candidates.length === 0) {
    return "No comparable listings available.";
  }

  const cheapest = [...candidates].sort((a, b) => a.priceRwf - b.priceRwf)[0];
  const priciest = [...candidates].sort((a, b) => b.priceRwf - a.priceRwf)[0];
  const average = Math.round(
    candidates.reduce((sum, listing) => sum + listing.priceRwf, 0) / candidates.length
  );

  return [
    `Cheapest relevant option: ${cheapest.title} at ${cheapest.priceRwf.toLocaleString()} RWF from ${cheapest.merchant.businessName} in ${cheapest.merchant.neighborhood}.`,
    `Highest priced relevant option: ${priciest.title} at ${priciest.priceRwf.toLocaleString()} RWF from ${priciest.merchant.businessName}.`,
    `Average price across top matches: ${average.toLocaleString()} RWF.`
  ].join("\n");
}

function buildNeighborhoodHighlights(listings: any[]) {
  const grouped = new Map<string, number>();

  for (const listing of listings) {
    grouped.set(listing.merchant.neighborhood, (grouped.get(listing.merchant.neighborhood) ?? 0) + 1);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([neighborhood, count]) => `${neighborhood}: ${count} active listing(s)`)
    .join("\n");
}

function rankRelevantListings(message: string, listings: any[]) {
  const tokens = message
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  return [...listings].sort((a, b) => scoreListing(b, tokens) - scoreListing(a, tokens));
}

function scoreListing(listing: any, tokens: string[]) {
  let score = 0;
  const haystack = [
    listing.title,
    listing.description,
    listing.category,
    listing.merchant.businessName,
    listing.merchant.neighborhood,
    ...(listing.tags ?? [])
  ]
    .join(" ")
    .toLowerCase();

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 3;
    }
  }

  if (listing.merchant.verified) {
    score += 1;
  }
  if (listing.isFeatured) {
    score += 1;
  }
  if (listing.inventoryStatus === "IN_STOCK") {
    score += 1;
  }
  if (listing.distance !== undefined) {
    score += Math.max(0, 5 - listing.distance);
  }

  return score;
}

function generateSuggestions(message: string, listings: any[]): string[] {
  const lowerMessage = message.toLowerCase();
  const suggestions: string[] = [];

  if (lowerMessage.includes("price") || lowerMessage.includes("cheap") || lowerMessage.includes("expensive")) {
    suggestions.push("Show me the best value options");
    suggestions.push("What's the price range for this category?");
    suggestions.push("Compare the cheapest and closest options");
  }

  if (lowerMessage.includes("near") || lowerMessage.includes("close") || lowerMessage.includes("nearby")) {
    suggestions.push("Which merchant is closest to me?");
    suggestions.push("Show me options in different neighborhoods");
  }

  if (lowerMessage.includes("fresh") || lowerMessage.includes("quality") || lowerMessage.includes("best")) {
    suggestions.push("Which merchants are verified?");
    suggestions.push("Show me the freshest options");
  }

  if (listings.length > 0) {
    const categories = [...new Set(listings.map((l) => l.category))];
    if (categories.length > 1) {
      suggestions.push(`Compare options across ${categories.join(" and ")}`);
    }
  }

  if (suggestions.length === 0) {
    suggestions.push("What else is available nearby?");
    suggestions.push("Show me similar products");
    suggestions.push("Which option offers the best value?");
  }

  return [...new Set(suggestions)].slice(0, 4);
}
