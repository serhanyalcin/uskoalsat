import { Elysia, t } from "elysia";
import { redisPublisher, redisSubscriber } from "../../realtime/redis";
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
