import { randomInt } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { bids, listings, trades, users } from "../../db/schema";
import { writeAuditLog } from "../audit/service";

interface MatchInput {
  listingId: string;
  buyerUserId?: string;
  buyerGameNick: string;
  sellerGameNick: string;
  reason: "auction_end" | "buy_now";
  ipAddress?: string;
}

async function createUniqueTradeCode(): Promise<string> {
  for (let i = 0; i < 20; i += 1) {
    const code = `#TRD-${randomInt(1000, 9999)}`;
    const [existing] = await db.select({ id: trades.id }).from(trades).where(eq(trades.tradeCode, code)).limit(1);
    if (!existing) {
      return code;
    }
  }
  throw new Error("Trade kodu uretilemedi, tekrar deneyin");
}

export async function createTradeMatch(input: MatchInput): Promise<{
  trade: typeof trades.$inferSelect;
  settlementAmountGb: number;
  itemName: string;
  itemType: string;
}> {
  return db.transaction(async (tx) => {
    const [listing] = await tx.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);

    if (!listing) {
      throw new Error("Ilan bulunamadi");
    }

    const [existingTrade] = await tx.select().from(trades).where(eq(trades.listingId, listing.id)).limit(1);
    if (existingTrade) {
      return {
        trade: existingTrade,
        settlementAmountGb: listing.buyNowGb ?? listing.currentBidGb ?? 0,
        itemName: listing.itemName,
        itemType: listing.itemType
      };
    }

    let buyerUserId = input.buyerUserId;
    let winningBidId: string | undefined;
    let settlementAmountGb = listing.buyNowGb ?? listing.currentBidGb ?? 0;

    if (input.reason === "auction_end") {
      const [winnerBid] = await tx
        .select()
        .from(bids)
        .where(eq(bids.listingId, listing.id))
        .orderBy(desc(bids.amountGb), desc(bids.createdAt), desc(bids.id))
        .limit(1);

      if (!winnerBid) {
        throw new Error("Acik artirma kazanan teklifi bulunamadi");
      }

      buyerUserId = winnerBid.bidderUserId;
      winningBidId = winnerBid.id;
      settlementAmountGb = winnerBid.amountGb;
    }

    if (!buyerUserId) {
      throw new Error("Alici kullanici bilgisi gerekli");
    }

    const [buyer] = await tx.select({ id: users.id }).from(users).where(eq(users.id, buyerUserId)).limit(1);
    if (!buyer) {
      throw new Error("Alici bulunamadi");
    }

    const code = await createUniqueTradeCode();

    const [created] = await tx
      .insert(trades)
      .values({
        listingId: listing.id,
        sellerUserId: listing.sellerUserId,
        buyerUserId,
        winningBidId,
        tradeCode: code,
        reason: input.reason,
        status: "pending",
        serverName: listing.serverName,
        camp: listing.camp,
        buyerGameNick: input.buyerGameNick,
        sellerGameNick: input.sellerGameNick
      })
      .returning();

    await tx
      .update(listings)
      .set({
        status: "sold",
        updatedAt: new Date()
      })
      .where(eq(listings.id, listing.id));

    await writeAuditLog({
      action: "trade.match.created",
      context: JSON.stringify({ tradeCode: created.tradeCode, listingId: listing.id, reason: input.reason }),
      userId: buyerUserId,
      ipAddress: input.ipAddress
    });

    return {
      trade: created,
      settlementAmountGb,
      itemName: listing.itemName,
      itemType: listing.itemType
    };
  });
}

export async function getTradeRoomByCode(tradeCode: string): Promise<(typeof trades.$inferSelect) | null> {
  const [trade] = await db.select().from(trades).where(eq(trades.tradeCode, tradeCode)).limit(1);
  return trade ?? null;
}

export async function updateTradeStatus(input: {
  tradeCode: string;
  actorUserId: string;
  status: "in_progress" | "completed" | "disputed" | "cancelled";
  ipAddress?: string;
}): Promise<typeof trades.$inferSelect> {
  const [trade] = await db.select().from(trades).where(eq(trades.tradeCode, input.tradeCode)).limit(1);
  if (!trade) {
    throw new Error("Trade odasi bulunamadi");
  }

  if (trade.buyerUserId !== input.actorUserId && trade.sellerUserId !== input.actorUserId) {
    throw new Error("Bu odayi guncelleme yetkiniz yok");
  }

  const [updated] = await db
    .update(trades)
    .set({
      status: input.status,
      updatedAt: new Date()
    })
    .where(and(eq(trades.id, trade.id), eq(trades.tradeCode, input.tradeCode)))
    .returning();

  await writeAuditLog({
    action: "trade.status.updated",
    context: JSON.stringify({ tradeCode: input.tradeCode, status: input.status }),
    userId: input.actorUserId,
    ipAddress: input.ipAddress
  });

  return updated;
}
