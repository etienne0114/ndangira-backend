import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { aiRouter } from "./routes/ai.js";
import { healthRouter } from "./routes/health.js";
import { listingsRouter } from "./routes/listings.js";

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
    message: "Neighborhood-first marketplace API for Kigali."
  });
});

app.use("/health", healthRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/ai", aiRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  response.status(400).json({ message });
});
