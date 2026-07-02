import { Buffer } from "node:buffer";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { db } from "../../db/client";
import { notifications, type notificationKindEnum } from "../../db/schema";
import { redisPublisher } from "../../realtime/redis";

const NOTIFICATION_CHANNEL = "notification:events";
type NotificationKind = (typeof notificationKindEnum.enumValues)[number];

interface CursorValue {
  createdAt: string;
  id: string;
}

function encodeCursor(input: CursorValue): string {
  return Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): CursorValue | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as CursorValue;
    if (!parsed.createdAt || !parsed.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function createNotification(input: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): Promise<typeof notifications.$inferSelect> {
  const [created] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      metadata: JSON.stringify(input.metadata ?? {})
    })
    .returning();

  await redisPublisher.publish(
    NOTIFICATION_CHANNEL,
    JSON.stringify({
      kind: "notification.created",
      payload: {
        userId: created.userId,
        notificationId: created.id,
        type: created.kind,
        title: created.title,
        body: created.body,
        createdAt: created.createdAt
      }
    })
  );

  return created;
}

export async function listNotifications(input: {
  userId: string;
  unreadOnly?: boolean;
  cursor?: string;
  limit?: number;
}): Promise<{ items: Array<typeof notifications.$inferSelect>; nextCursor: string | null }> {
  const pageSize = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const conditions = [eq(notifications.userId, input.userId)] as Array<any>;

  if (input.unreadOnly) {
    conditions.push(eq(notifications.isRead, false));
  }

  if (input.cursor) {
    const cursorValue = decodeCursor(input.cursor);
    if (cursorValue) {
      const createdAt = new Date(cursorValue.createdAt);
      conditions.push(
        or(
          lt(notifications.createdAt, createdAt),
          and(eq(notifications.createdAt, createdAt), lt(notifications.id, cursorValue.id))
        )
      );
    }
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(pageSize + 1);

  const hasNext = rows.length > pageSize;
  const items = hasNext ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasNext
    ? encodeCursor({ createdAt: items[items.length - 1]!.createdAt.toISOString(), id: items[items.length - 1]!.id })
    : null;

  return { items, nextCursor };
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return result.rowCount ?? 0;
}
