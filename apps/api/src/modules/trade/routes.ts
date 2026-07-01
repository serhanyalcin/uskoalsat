import { Elysia, t } from "elysia";
import { redisPublisher } from "../../realtime/redis";
import { createTradeMatch, getTradeRoomByCode, updateTradeStatus } from "./service";

const TRADE_CHANNEL = "trade:events";

async function publishTradeEvent(event: Record<string, unknown>): Promise<void> {
  await redisPublisher.publish(TRADE_CHANNEL, JSON.stringify(event));
}

function getIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export const tradeRoutes = new Elysia({ prefix: "/trade" })
  .post(
    "/matches",
    async ({ body, request, status }) => {
      try {
        const trade = await createTradeMatch({
          listingId: body.listingId,
          buyerUserId: body.buyerUserId,
          reason: body.reason,
          buyerGameNick: body.buyerGameNick,
          sellerGameNick: body.sellerGameNick,
          ipAddress: getIp(request)
        });

        await publishTradeEvent({
          kind: "trade.match.created",
          payload: {
            tradeCode: trade.tradeCode,
            listingId: trade.listingId,
            status: trade.status,
            reason: trade.reason,
            serverName: trade.serverName,
            camp: trade.camp
          }
        });

        return {
          ok: true,
          trade
        };
      } catch (error) {
        return status(400, { error: (error as Error).message });
      }
    },
    {
      body: t.Object({
        listingId: t.String({ minLength: 10 }),
        buyerUserId: t.Optional(t.String({ minLength: 10 })),
        reason: t.Union([t.Literal("auction_end"), t.Literal("buy_now")]),
        buyerGameNick: t.String({ minLength: 2, maxLength: 24 }),
        sellerGameNick: t.String({ minLength: 2, maxLength: 24 })
      })
    }
  )
  .get(
    "/rooms/:tradeCode",
    async ({ params, status }) => {
      const trade = await getTradeRoomByCode(params.tradeCode);
      if (!trade) {
        return status(404, { error: "Trade odasi bulunamadi" });
      }

      return {
        trade
      };
    },
    {
      params: t.Object({
        tradeCode: t.String({ minLength: 8, maxLength: 24 })
      })
    }
  )
  .post(
    "/rooms/:tradeCode/status",
    async ({ params, body, request, status }) => {
      try {
        const trade = await updateTradeStatus({
          tradeCode: params.tradeCode,
          actorUserId: body.actorUserId,
          status: body.status,
          ipAddress: getIp(request)
        });

        await publishTradeEvent({
          kind: "trade.status.updated",
          payload: {
            tradeCode: trade.tradeCode,
            status: trade.status,
            updatedAt: trade.updatedAt
          }
        });

        return {
          ok: true,
          trade
        };
      } catch (error) {
        return status(400, { error: (error as Error).message });
      }
    },
    {
      params: t.Object({
        tradeCode: t.String({ minLength: 8, maxLength: 24 })
      }),
      body: t.Object({
        actorUserId: t.String({ minLength: 10 }),
        status: t.Union([
          t.Literal("in_progress"),
          t.Literal("completed"),
          t.Literal("disputed"),
          t.Literal("cancelled")
        ])
      })
    }
  );
