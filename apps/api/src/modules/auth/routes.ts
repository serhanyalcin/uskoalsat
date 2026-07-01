import { randomUUID } from "node:crypto";
import { jwt } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";
import { env } from "../../config/env";

interface SessionUser {
  id: string;
  email: string;
  role: "user" | "merchant" | "admin";
}

const demoUsers = new Map<string, SessionUser>();
const revokedRefreshTokens = new Set<string>();

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: env.JWT_ACCESS_SECRET
    })
  )
  .post(
    "/register",
    async ({ body }) => {
      const id = randomUUID();
      const user: SessionUser = {
        id,
        email: body.email,
        role: body.role
      };
      demoUsers.set(id, user);

      return {
        user,
        message: "Kullanici kaydi olusturuldu. Aktivasyon akisi bir sonraki issue'da eklenecek."
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
        role: t.Union([t.Literal("user"), t.Literal("merchant")])
      })
    }
  )
  .post(
    "/login",
    async ({ body, jwt }) => {
      const user = Array.from(demoUsers.values()).find((candidate) => candidate.email === body.email);

      if (!user) {
        return { error: "Kullanici bulunamadi. Once register olun." };
      }

      const accessToken = await jwt.sign({ sub: user.id, role: user.role, type: "access" });
      const refreshToken = await jwt.sign({ sub: user.id, role: user.role, type: "refresh", jti: randomUUID() });

      return {
        accessToken,
        refreshToken,
        user
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 })
      })
    }
  )
  .post(
    "/refresh",
    async ({ body, jwt }) => {
      const payload = await jwt.verify(body.refreshToken);

      if (!payload || payload.type !== "refresh") {
        return { error: "Gecersiz refresh token" };
      }

      if (payload.jti && revokedRefreshTokens.has(String(payload.jti))) {
        return { error: "Token revoke edilmis" };
      }

      if (payload && typeof payload === "object" && "jti" in payload && payload.jti) {
        revokedRefreshTokens.add(String(payload.jti));
      }

      const nextAccessToken = await jwt.sign({ sub: payload.sub, role: payload.role, type: "access" });
      const nextRefreshToken = await jwt.sign({ sub: payload.sub, role: payload.role, type: "refresh", jti: randomUUID() });

      return {
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken
      };
    },
    {
      body: t.Object({
        refreshToken: t.String({ minLength: 10 })
      })
    }
  )
  .post(
    "/revoke",
    async ({ body, jwt }) => {
      const payload = await jwt.verify(body.refreshToken);
      if (payload && typeof payload === "object" && "jti" in payload && payload.jti) {
        revokedRefreshTokens.add(String(payload.jti));
      }
      return { ok: true };
    },
    {
      body: t.Object({
        refreshToken: t.String({ minLength: 10 })
      })
    }
  );
