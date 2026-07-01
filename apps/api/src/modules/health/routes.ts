import { Elysia } from "elysia";

export const healthRoutes = new Elysia({ prefix: "/health" }).get("", () => ({
  ok: true,
  service: "api",
  timestamp: new Date().toISOString()
}));
