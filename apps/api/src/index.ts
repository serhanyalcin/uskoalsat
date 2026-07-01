import { mkdir } from "node:fs/promises";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { env } from "./config/env";
import { authRoutes } from "./modules/auth/routes";
import { healthRoutes } from "./modules/health/routes";
import { marketRoutes } from "./modules/market/routes";
import { tradeRoutes } from "./modules/trade/routes";

await mkdir(env.UPLOAD_DIR, { recursive: true });

const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true
    })
  )
  .use(
    jwt({
      name: "jwt",
      secret: env.JWT_ACCESS_SECRET
    })
  )
  .use(swagger({ documentation: { info: { title: "USKO ALSAT API", version: "0.1.0" } } }))
  .get("/", () => ({ service: "uskoalsat-api", status: "ok" }))
  .use(healthRoutes)
  .use(authRoutes)
  .use(marketRoutes)
  .use(tradeRoutes)
  .listen(env.API_PORT);

console.log(`API listening on http://localhost:${env.API_PORT}`);
console.log(`Swagger available at http://localhost:${env.API_PORT}/swagger`);
