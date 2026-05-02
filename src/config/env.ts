import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET is required").default("ndangira_dev_secret_change_in_production"),
  ADMIN_EMAIL: z.string().email().default("admin@ndangira.rw"),
  ADMIN_PASSWORD: z.string().min(6).default("admin123"),
  OPENROUTER_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("deepseek/deepseek-chat"),
  OPENROUTER_SITE_URL: z.string().default("https://ndangira-frontend.vercel.app"),
  OPENROUTER_APP_NAME: z.string().default("Ndangira")
});

export const env = envSchema.parse(process.env);
