import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { priceHistoryEvents } from "../../db/schema";

export async function recordPriceHistoryEvent(input: {
  listingId?: string;
  bidId?: string;
  tradeId?: string;
  itemName: string;
  itemType: string;
  serverName: string;
  camp: number;
  eventType: "bid" | "sale";
  amountGb: number;
}): Promise<void> {
  await db.insert(priceHistoryEvents).values(input);
}

export async function getPriceHistory(input: {
  itemName: string;
  serverName?: string;
  camp?: number;
  limit?: number;
}): Promise<Array<typeof priceHistoryEvents.$inferSelect>> {
  const conditions = [eq(priceHistoryEvents.itemName, input.itemName)] as Array<any>;

  if (input.serverName) {
    conditions.push(eq(priceHistoryEvents.serverName, input.serverName));
  }

  if (input.camp !== undefined) {
    conditions.push(eq(priceHistoryEvents.camp, input.camp));
  }

  return db
    .select()
    .from(priceHistoryEvents)
    .where(and(...conditions))
    .orderBy(desc(priceHistoryEvents.createdAt), desc(priceHistoryEvents.id))
    .limit(Math.min(Math.max(input.limit ?? 50, 1), 200));
}
