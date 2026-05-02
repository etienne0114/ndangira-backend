import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { aiRouter } from "./routes/ai.js";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { listingsRouter } from "./routes/listings.js";
import { merchantRouter } from "./routes/merchant.js";
import { statsRouter } from "./routes/stats.js";

export const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((value) => value.trim())
  })
);
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    name: "Ndangira API",
    message: "Neighborhood-first marketplace API for Kigali.",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      listings: "/api/listings",
      ai: "/api/ai/assistant",
      stats: "/api/stats"
    }
  });
});

app.use("/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/ai", aiRouter);
app.use("/api/merchant", merchantRouter);
app.use("/api/stats", statsRouter);

// Enhanced error handling middleware
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error("Error:", error);
  
  // Zod validation errors
  if (error && typeof error === "object" && "issues" in error) {
    response.status(400).json({ 
      message: "Validation error",
      errors: error.issues 
    });
    return;
  }
  
  // Standard errors
  if (error instanceof Error) {
    response.status(400).json({ 
      message: error.message,
      type: error.name
    });
    return;
  }
  
  // Unknown errors
  response.status(500).json({ 
    message: "Unexpected server error. Please try again later." 
  });
});
