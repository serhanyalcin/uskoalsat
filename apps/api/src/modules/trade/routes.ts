import { Elysia, t } from "elysia";
import { createNotification } from "../notification/service";
import { recordPriceHistoryEvent } from "../price/service";
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
        const result = await createTradeMatch({
          listingId: body.listingId,
          buyerUserId: body.buyerUserId,
          reason: body.reason,
          buyerGameNick: body.buyerGameNick,
          sellerGameNick: body.sellerGameNick,
          ipAddress: getIp(request)
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
          title: "Trade eslesmesi olustu",
          body: `${result.itemName} icin yeni trade odasi olustu: ${result.trade.tradeCode}`,
          metadata: { tradeCode: result.trade.tradeCode, listingId: result.trade.listingId }
        });

        await createNotification({
          userId: result.trade.buyerUserId,
          kind: "trade_matched",
          title: "Trade odan hazir",
          body: `${result.itemName} icin trade odasi hazir: ${result.trade.tradeCode}`,
          metadata: { tradeCode: result.trade.tradeCode, listingId: result.trade.listingId }
        });

        await publishTradeEvent({
          kind: "trade.match.created",
          payload: {
            tradeCode: result.trade.tradeCode,
            listingId: result.trade.listingId,
            status: result.trade.status,
            reason: result.trade.reason,
            serverName: result.trade.serverName,
            camp: result.trade.camp
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

        const recipientUserId = trade.buyerUserId === body.actorUserId ? trade.sellerUserId : trade.buyerUserId;
        await createNotification({
          userId: recipientUserId,
          kind: "trade_status_changed",
          title: "Trade durumu guncellendi",
          body: `${trade.tradeCode} kodlu trade durumu ${trade.status} olarak guncellendi.`,
          metadata: { tradeCode: trade.tradeCode, status: trade.status }
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
