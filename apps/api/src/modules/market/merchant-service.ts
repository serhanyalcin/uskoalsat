import { Buffer } from "node:buffer";
import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "../../db/client";
import { listings } from "../../db/schema";

interface MerchantListQuery {
  merchantUserId: string;
  status?: "active" | "sold" | "passive" | "expired";
  cursor?: string;
  limit?: number;
}

interface CursorValue {
  createdAt: string;
  id: string;
}

function encodeCursor(input: CursorValue): string {
  return Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): CursorValue | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as CursorValue;
    if (!parsed.createdAt || !parsed.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getMerchantListings(query: MerchantListQuery): Promise<{ items: Array<typeof listings.$inferSelect>; nextCursor: string | null }> {
  const pageSize = Math.min(Math.max(query.limit ?? 20, 1), 50);
  const conditions = [eq(listings.sellerUserId, query.merchantUserId)] as Array<any>;

  if (query.status) {
    conditions.push(eq(listings.status, query.status));
  }

  if (query.cursor) {
    const cursorValue = decodeCursor(query.cursor);
    if (cursorValue) {
      const createdAt = new Date(cursorValue.createdAt);
      conditions.push(
        or(
          lt(listings.createdAt, createdAt),
          and(eq(listings.createdAt, createdAt), lt(listings.id, cursorValue.id))
        )
      );
    }
  }

  const rows = await db
    .select()
    .from(listings)
    .where(and(...conditions))
    .orderBy(desc(listings.createdAt), desc(listings.id))
    .limit(pageSize + 1);

  const hasNext = rows.length > pageSize;
  const items = hasNext ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasNext
    ? encodeCursor({
        createdAt: items[items.length - 1]!.createdAt.toISOString(),
        id: items[items.length - 1]!.id
      })
    : null;

  return { items, nextCursor };
}

interface BulkCreateItem {
  itemName: string;
  itemType: string;
  serverName?: string;
  camp: number;
  listingType: "auction" | "buy_now";
  buyNowGb?: number;
  startBidGb?: number;
  durationMinutes?: number;
}

export async function bulkCreateListings(merchantUserId: string, items: BulkCreateItem[]): Promise<Array<typeof listings.$inferSelect>> {
  const now = Date.now();
  const values = items.map((item) => ({
    sellerUserId: merchantUserId,
    itemName: item.itemName,
    itemType: item.itemType,
    serverName: item.serverName ?? "Zero",
    camp: item.camp,
    listingType: item.listingType,
    status: "active" as const,
    currentBidGb: item.startBidGb ?? null,
    buyNowGb: item.listingType === "buy_now" ? (item.buyNowGb ?? null) : null,
    endAt: item.listingType === "auction" ? new Date(now + (item.durationMinutes ?? 60) * 60 * 1000) : null
  }));

  return db.insert(listings).values(values).returning();
}

export async function bulkUpdateListingStatus(merchantUserId: string, listingIds: string[], nextStatus: "active" | "sold" | "passive"): Promise<number> {
  const result = await db
    .update(listings)
    .set({
      status: nextStatus,
      updatedAt: new Date()
    })
    .where(and(eq(listings.sellerUserId, merchantUserId), inArray(listings.id, listingIds)));

  return result.rowCount ?? 0;
}
