import { Elysia, t } from "elysia";
import { redisPublisher } from "../../realtime/redis";
import { listDisputes, openDispute, resolveDispute } from "./service";

const MOD_CHANNEL = "moderation:events";

async function publishModerationEvent(event: Record<string, unknown>): Promise<void> {
  await redisPublisher.publish(MOD_CHANNEL, JSON.stringify(event));
}

function getIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

export const moderationRoutes = new Elysia({ prefix: "/moderation" })
  .post(
    "/disputes",
    async ({ body, request, status }) => {
      try {
        const dispute = await openDispute({
          tradeCode: body.tradeCode,
          reporterUserId: body.reporterUserId,
          reportedUserId: body.reportedUserId,
          evidencePath: body.evidencePath,
          reason: body.reason,
          ipAddress: getIp(request)
        });

        await publishModerationEvent({
          kind: "dispute.opened",
          payload: {
            disputeId: dispute.id,
            tradeId: dispute.tradeId,
            status: dispute.status,
            createdAt: dispute.createdAt
          }
        });

        return { ok: true, dispute };
      } catch (error) {
        return status(400, { error: (error as Error).message });
      }
    },
    {
      body: t.Object({
        tradeCode: t.String({ minLength: 8, maxLength: 24 }),
        reporterUserId: t.String({ minLength: 10 }),
        reportedUserId: t.String({ minLength: 10 }),
        evidencePath: t.String({ minLength: 3 }),
        reason: t.String({ minLength: 5, maxLength: 1000 })
      })
    }
  )
  .get(
    "/disputes",
    async ({ query }) => {
      const items = await listDisputes(query.status);
      return { items };
    },
    {
      query: t.Object({
        status: t.Optional(t.Union([t.Literal("open"), t.Literal("resolved"), t.Literal("rejected")]))
      })
    }
  )
  .post(
    "/disputes/:disputeId/resolve",
    async ({ params, body, request, status }) => {
      try {
        const result = await resolveDispute({
          disputeId: params.disputeId,
          adminUserId: body.adminUserId,
          decision: body.decision,
          adminDecisionNote: body.adminDecisionNote,
          strikeUserId: body.strikeUserId,
          strikeReason: body.strikeReason,
          ipAddress: getIp(request)
        });

        await publishModerationEvent({
          kind: "dispute.resolved",
          payload: {
            disputeId: result.dispute.id,
            status: result.dispute.status,
            strikeApplied: result.strikeApplied,
            banned: result.banned,
            resolvedAt: result.dispute.resolvedAt
          }
        });

        return { ok: true, ...result };
      } catch (error) {
        return status(400, { error: (error as Error).message });
      }
    },
    {
      params: t.Object({
        disputeId: t.String({ minLength: 10 })
      }),
      body: t.Object({
        adminUserId: t.String({ minLength: 10 }),
        decision: t.Union([t.Literal("resolved"), t.Literal("rejected")]),
        adminDecisionNote: t.String({ minLength: 5, maxLength: 1000 }),
        strikeUserId: t.Optional(t.String({ minLength: 10 })),
        strikeReason: t.Optional(t.String({ minLength: 3, maxLength: 500 }))
      })
    }
  );
