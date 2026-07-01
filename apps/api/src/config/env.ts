import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  API_PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_USER: z.string().default("postgres"),
  POSTGRES_PASSWORD: z.string().default("postgres"),
  POSTGRES_DB: z.string().default("uskoalsat"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),
  UPLOAD_DIR: z.string().default("./storage/uploads")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed");
}

export const env = parsed.data;
