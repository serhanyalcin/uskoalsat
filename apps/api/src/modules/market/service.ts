import { Buffer } from "node:buffer";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { db } from "../../db/client";
import { bids, listings } from "../../db/schema";

interface ListingFeedQuery {
  camp?: number;
  listingType?: "auction" | "buy_now";
  serverName?: string;
  itemType?: string;
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

export async function getListingFeed(query: ListingFeedQuery): Promise<{ items: Array<typeof listings.$inferSelect>; nextCursor: string | null }> {
  const pageSize = Math.min(Math.max(query.limit ?? 20, 1), 50);
  const conditions = [] as Array<any>;

  if (query.status) {
    conditions.push(eq(listings.status, query.status));
  } else {
    conditions.push(eq(listings.status, "active"));
  }

  if (query.camp !== undefined) {
    conditions.push(eq(listings.camp, query.camp));
  }

  if (query.listingType) {
    conditions.push(eq(listings.listingType, query.listingType));
  }

  if (query.serverName) {
    conditions.push(eq(listings.serverName, query.serverName));
  }

  if (query.itemType) {
    conditions.push(eq(listings.itemType, query.itemType));
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

  return {
    items,
    nextCursor
  };
}

export async function createBid(input: { listingId: string; bidderUserId: string; amountGb: number }): Promise<{
  listingId: string;
  amountGb: number;
  bidId: string;
  bidderUserId: string;
  minRequiredBidGb: number;
  extendedTo?: string;
}> {
  return db.transaction(async (tx) => {
    const [listing] = await tx.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);

    if (!listing) {
      throw new Error("Ilan bulunamadi");
    }

    if (listing.status !== "active") {
      throw new Error("Ilan aktif degil");
    }

    if (listing.listingType !== "auction") {
      throw new Error("Sadece acik artirmaya teklif verilebilir");
    }

    if (!listing.endAt) {
      throw new Error("Acik artirma bitis suresi tanimli degil");
    }

    if (listing.endAt <= new Date()) {
      throw new Error("Acik artirma suresi dolmus");
    }

    const [lastBid] = await tx
      .select()
      .from(bids)
      .where(eq(bids.listingId, input.listingId))
      .orderBy(desc(bids.createdAt), desc(bids.id))
      .limit(1);

    if (lastBid && lastBid.bidderUserId === input.bidderUserId) {
      throw new Error("Ayni kullanici ust uste teklif veremez");
    }

    const currentBid = listing.currentBidGb ?? 0;
    const minIncrement = Math.max(1, Math.ceil(currentBid * 0.01));
    const minRequiredBidGb = currentBid + minIncrement;

    if (input.amountGb < minRequiredBidGb) {
      throw new Error(`Minimum teklif ${minRequiredBidGb} GB olmali`);
    }

    const [bid] = await tx
      .insert(bids)
      .values({
        listingId: input.listingId,
        bidderUserId: input.bidderUserId,
        amountGb: input.amountGb
      })
      .returning();

    const now = new Date();
    const remainingMs = listing.endAt.getTime() - now.getTime();
    let antiSnipeExtendedTo: Date | undefined;

    if (remainingMs <= 10_000) {
      antiSnipeExtendedTo = new Date(listing.endAt.getTime() + 30_000);
    }

    await tx
      .update(listings)
      .set({
        currentBidGb: input.amountGb,
        endAt: antiSnipeExtendedTo ?? listing.endAt,
        updatedAt: new Date()
      })
      .where(eq(listings.id, input.listingId));

    return {
      listingId: input.listingId,
      amountGb: input.amountGb,
      bidId: bid.id,
      bidderUserId: input.bidderUserId,
      minRequiredBidGb,
      extendedTo: antiSnipeExtendedTo?.toISOString()
    };
  });
}
