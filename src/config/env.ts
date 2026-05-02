import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("deepseek/deepseek-chat-v3-0324"),
  OPENROUTER_SITE_URL: z.string().url().default("https://ndangira.vercel.app"),
  OPENROUTER_APP_NAME: z.string().default("Ndangira")
});

export const env = envSchema.parse(process.env);
