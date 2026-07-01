import { jwt } from "@elysiajs/jwt";
import { Elysia, t } from "elysia";
import { env } from "../../config/env";
import {
  activateByToken,
  confirmPasswordReset,
  loginUser,
  registerUser,
  requestPasswordReset,
  revokeByRefreshToken,
  rotateRefreshToken
} from "./service/auth-service";

function getMeta(request: Request): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined
  };
}

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: env.JWT_ACCESS_SECRET
    })
  )
  .post(
    "/register",
    async ({ body, request, status }) => {
      try {
        const result = await registerUser({
          email: body.email,
          password: body.password,
          nickname: body.nickname,
          role: body.role,
          meta: getMeta(request)
        });

        return {
          user: result.user,
          activationToken: result.activationToken,
          message: "Kayit tamamlandi. Aktivasyon token'i ile hesabi aktif edin."
        };
      } catch (error) {
        return status(400, { error: (error as Error).message });
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
        nickname: t.String({ minLength: 3, maxLength: 24 }),
        role: t.Union([t.Literal("user"), t.Literal("merchant")])
      })
    }
  )
  .post(
    "/login",
    async ({ body, jwt, request, status }) => {
      try {
        const result = await loginUser({
          email: body.email,
          password: body.password,
          meta: getMeta(request)
        });

        const accessToken = await jwt.sign({
          sub: result.user.id,
          role: result.user.role,
          sid: result.sessionId,
          type: "access"
        });

        return {
          accessToken,
          refreshToken: result.refreshToken,
          user: result.user
        };
      } catch (error) {
        return status(401, { error: (error as Error).message });
      }
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
    async ({ body, jwt, request, status }) => {
      try {
        const result = await rotateRefreshToken({
          refreshTokenRaw: body.refreshToken,
          meta: getMeta(request)
        });

        const accessToken = await jwt.sign({
          sub: result.user.id,
          role: result.user.role,
          sid: result.sessionId,
          type: "access"
        });

        return {
          accessToken,
          refreshToken: result.refreshToken
        };
      } catch (error) {
        return status(401, { error: (error as Error).message });
      }
    },
    {
      body: t.Object({
        refreshToken: t.String({ minLength: 10 })
      })
    }
  )
  .post(
    "/revoke",
    async ({ body, request }) => {
      await revokeByRefreshToken(body.refreshToken, getMeta(request));
      return { ok: true };
    },
    {
      body: t.Object({
        refreshToken: t.String({ minLength: 10 })
      })
    }
  )
  .post(
    "/forgot-password",
    async ({ body, request }) => {
      const result = await requestPasswordReset({
        email: body.email,
        meta: getMeta(request)
      });
      return {
        ok: true,
        resetToken: result.resetToken
      };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" })
      })
    }
  )
  .post(
    "/reset-password",
    async ({ body, request, status }) => {
      try {
        await confirmPasswordReset({
          resetTokenRaw: body.resetToken,
          newPassword: body.newPassword,
          meta: getMeta(request)
        });
        return { ok: true };
      } catch (error) {
        return status(400, { error: (error as Error).message });
      }
    },
    {
      body: t.Object({
        resetToken: t.String({ minLength: 12 }),
        newPassword: t.String({ minLength: 8 })
      })
    }
  )
  .post(
    "/activate",
    async ({ body, request, status }) => {
      try {
        await activateByToken(body.activationToken, getMeta(request));
        return { ok: true };
      } catch (error) {
        return status(400, { error: (error as Error).message });
      }
    },
    {
      body: t.Object({
        activationToken: t.String({ minLength: 12 })
      })
    }
  );
