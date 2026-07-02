import { Elysia, t } from "elysia";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "./service";

export const notificationRoutes = new Elysia({ prefix: "/notifications" })
  .get(
    "",
    async ({ query }) => {
      return listNotifications({
        userId: query.userId,
        unreadOnly: query.unreadOnly,
        cursor: query.cursor,
        limit: query.limit
      });
    },
    {
      query: t.Object({
        userId: t.String({ minLength: 10 }),
        unreadOnly: t.Optional(t.Boolean()),
        cursor: t.Optional(t.String({ minLength: 8 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 }))
      })
    }
  )
  .post(
    "/:notificationId/read",
    async ({ params, body }) => {
      await markNotificationRead(params.notificationId, body.userId);
      return { ok: true };
    },
    {
      params: t.Object({
        notificationId: t.String({ minLength: 10 })
      }),
      body: t.Object({
        userId: t.String({ minLength: 10 })
      })
    }
  )
  .post(
    "/read-all",
    async ({ body }) => {
      const updated = await markAllNotificationsRead(body.userId);
      return { ok: true, updated };
    },
    {
      body: t.Object({
        userId: t.String({ minLength: 10 })
      })
    }
  );
