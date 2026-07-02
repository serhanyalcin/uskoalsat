import { Elysia, t } from "elysia";
import { redisPublisher, redisSubscriber } from "../../realtime/redis";
import { createNotification } from "../notification/service";
import { recordPriceHistoryEvent } from "../price/service";
import { createTradeMatch } from "../trade/service";
import { bulkCreateListings, bulkUpdateListingStatus, getMerchantListings } from "./merchant-service";
import { createBid, getListingFeed } from "./service";

const MARKET_CHANNEL = "market:events";
const wsClients = new Set<any>();
let subscriberBootstrapped = false;

async function publishMarketEvent(event: Record<string, unknown>): Promise<void> {
  await redisPublisher.publish(MARKET_CHANNEL, JSON.stringify(event));
}

async function ensureSubscriber(): Promise<void> {
  if (subscriberBootstrapped) {
    return;
  }

  await redisSubscriber.subscribe(MARKET_CHANNEL);
  redisSubscriber.on("message", (channel, message) => {
    if (channel !== MARKET_CHANNEL) {
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(message);
    } catch {
      payload = { kind: "market.raw", payload: message };
    }

    for (const client of wsClients) {
      client.send(payload);
    }
  });

  subscriberBootstrapped = true;
}

export const marketRoutes = new Elysia({ prefix: "/market" })
  .get(
    "/listings",
    async ({ query }) => {
      const result = await getListingFeed({
        camp: query.camp,
        listingType: query.listingType,
        serverName: query.serverName,
        itemType: query.itemType,
        status: query.status,
        cursor: query.cursor,
        limit: query.limit
      });

      return {
        items: result.items,
        nextCursor: result.nextCursor
      };
    },
    {
      query: t.Object({
        camp: t.Optional(t.Numeric({ minimum: 1, maximum: 5 })),
        listingType: t.Optional(t.Union([t.Literal("auction"), t.Literal("buy_now")])),
        serverName: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
        itemType: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
        status: t.Optional(t.Union([t.Literal("active"), t.Literal("sold"), t.Literal("passive"), t.Literal("expired")])),
        cursor: t.Optional(t.String({ minLength: 8 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 }))
      })
    }
  )
  .post(
    "/listings/:listingId/bids",
    async ({ params, body, status }) => {
      try {
        const bid = await createBid({
          listingId: params.listingId,
          bidderUserId: body.bidderUserId,
          amountGb: body.amountGb
        });

        const event = {
          kind: "bid.created",
          payload: {
            listingId: bid.listingId,
            bidId: bid.bidId,
            amountGb: bid.amountGb,
            bidderUserId: bid.bidderUserId,
            minRequiredBidGb: bid.minRequiredBidGb,
            antiSnipeExtendedTo: bid.extendedTo ?? null,
            createdAt: new Date().toISOString()
          }
        };

        await recordPriceHistoryEvent({
          listingId: bid.listingId,
          bidId: bid.bidId,
          itemName: bid.itemName,
          itemType: bid.itemType,
          serverName: bid.serverName,
          camp: bid.camp,
          eventType: "bid",
          amountGb: bid.amountGb
        });

        await createNotification({
          userId: bid.sellerUserId,
          kind: "bid_received",
          title: "Ilanina yeni teklif geldi",
          body: `${bid.itemName} icin ${bid.amountGb} GB teklif verildi.`,
          metadata: {
            listingId: bid.listingId,
            bidId: bid.bidId,
            amountGb: bid.amountGb
          }
        });

        if (bid.extendedTo) {
          await createNotification({
            userId: bid.sellerUserId,
            kind: "auction_extended",
            title: "Acik artirma suresi uzatildi",
            body: `${bid.itemName} ilani son 10 saniyede teklif aldigi icin sure uzatildi.`,
            metadata: {
              listingId: bid.listingId,
              extendedTo: bid.extendedTo
            }
          });
        }

        await publishMarketEvent(event);

        return {
          ok: true,
          bid
        };
      } catch (error) {
        return status(400, { error: (error as Error).message });
      }
    },
    {
      params: t.Object({
        listingId: t.String({ minLength: 10 })
      }),
      body: t.Object({
        bidderUserId: t.String({ minLength: 10 }),
        amountGb: t.Numeric({ minimum: 1 })
      })
    }
  )
  .post(
    "/listings/:listingId/buy-now",
    async ({ params, body, request, status }) => {
      try {
        const result = await createTradeMatch({
          listingId: params.listingId,
          buyerUserId: body.buyerUserId,
          reason: "buy_now",
          buyerGameNick: body.buyerGameNick,
          sellerGameNick: body.sellerGameNick,
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined
        });

        await recordPriceHistoryEvent({
          listingId: result.trade.listingId,
          tradeId: result.trade.id,
          itemName: result.itemName,
          itemType: result.itemType,
          serverName: result.trade.serverName,
          camp: result.trade.camp,
          eventType: "sale",
          amountGb: result.settlementAmountGb
        });

        await createNotification({
          userId: result.trade.sellerUserId,
          kind: "trade_matched",
          title: "Hemen al ile eslesme saglandi",
          body: `${result.itemName} icin alici bulundu. Islem kodu: ${result.trade.tradeCode}`,
          metadata: {
            tradeCode: result.trade.tradeCode,
            listingId: result.trade.listingId
          }
        });

        await createNotification({
          userId: result.trade.buyerUserId,
          kind: "trade_matched",
          title: "Satin alim eslesmesi hazir",
          body: `${result.itemName} icin trade odasi hazir. Islem kodu: ${result.trade.tradeCode}`,
          metadata: {
            tradeCode: result.trade.tradeCode,
            listingId: result.trade.listingId
          }
        });

        await publishMarketEvent({
          kind: "listing.buy_now.matched",
          payload: {
            listingId: params.listingId,
            tradeCode: result.trade.tradeCode,
            buyerUserId: result.trade.buyerUserId,
            sellerUserId: result.trade.sellerUserId
          }
        });

        return {
          ok: true,
          trade: result.trade
        };
      } catch (error) {
        return status(400, { error: (error as Error).message });
      }
    },
    {
      params: t.Object({
        listingId: t.String({ minLength: 10 })
      }),
      body: t.Object({
        buyerUserId: t.String({ minLength: 10 }),
        buyerGameNick: t.String({ minLength: 2, maxLength: 24 }),
        sellerGameNick: t.String({ minLength: 2, maxLength: 24 })
      })
    }
  )
  .get(
    "/merchant/listings",
    async ({ query }) => {
      return getMerchantListings({
        merchantUserId: query.merchantUserId,
        status: query.status,
        cursor: query.cursor,
        limit: query.limit
      });
    },
    {
      query: t.Object({
        merchantUserId: t.String({ minLength: 10 }),
        status: t.Optional(t.Union([t.Literal("active"), t.Literal("sold"), t.Literal("passive"), t.Literal("expired")])),
        cursor: t.Optional(t.String({ minLength: 8 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 50 }))
      })
    }
  )
  .post(
    "/merchant/listings/bulk-create",
    async ({ body }) => {
      const created = await bulkCreateListings(body.merchantUserId, body.items);
      await publishMarketEvent({
        kind: "merchant.bulk_created",
        payload: {
          merchantUserId: body.merchantUserId,
          count: created.length,
          listingIds: created.map((item) => item.id)
        }
      });
      return {
        ok: true,
        count: created.length,
        items: created
      };
    },
    {
      body: t.Object({
        merchantUserId: t.String({ minLength: 10 }),
        items: t.Array(
          t.Object({
            itemName: t.String({ minLength: 2, maxLength: 100 }),
            itemType: t.String({ minLength: 2, maxLength: 50 }),
            serverName: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
            camp: t.Numeric({ minimum: 1, maximum: 5 }),
            listingType: t.Union([t.Literal("auction"), t.Literal("buy_now")]),
            buyNowGb: t.Optional(t.Numeric({ minimum: 1 })),
            startBidGb: t.Optional(t.Numeric({ minimum: 1 })),
            durationMinutes: t.Optional(t.Numeric({ minimum: 1, maximum: 1440 }))
          })
        )
      })
    }
  )
  .post(
    "/merchant/listings/bulk-status",
    async ({ body }) => {
      const updated = await bulkUpdateListingStatus(body.merchantUserId, body.listingIds, body.nextStatus);
      await publishMarketEvent({
        kind: "merchant.bulk_status_updated",
        payload: {
          merchantUserId: body.merchantUserId,
          listingIds: body.listingIds,
          nextStatus: body.nextStatus,
          updated
        }
      });
      return {
        ok: true,
        updated
      };
    },
    {
      body: t.Object({
        merchantUserId: t.String({ minLength: 10 }),
        listingIds: t.Array(t.String({ minLength: 10 }), { minItems: 1, maxItems: 200 }),
        nextStatus: t.Union([t.Literal("active"), t.Literal("sold"), t.Literal("passive")])
      })
    }
  )
  .ws("/feed", {
    async message(_ws, message) {
      const event = {
        kind: "market.client_event",
        payload: message
      };
      await publishMarketEvent(event);
    },
    async open(ws) {
      await ensureSubscriber();
      wsClients.add(ws);
      ws.send({
        kind: "welcome",
        payload: "Realtime pazar feed baglantisi aktif"
      });
    },
    close(ws) {
      wsClients.delete(ws);
    }
  });
