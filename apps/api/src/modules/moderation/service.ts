import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { disputes, strikes, trades, users } from "../../db/schema";
import { writeAuditLog } from "../audit/service";

export async function openDispute(input: {
  tradeCode: string;
  reporterUserId: string;
  reportedUserId: string;
  evidencePath: string;
  reason: string;
  ipAddress?: string;
}): Promise<typeof disputes.$inferSelect> {
  return db.transaction(async (tx) => {
    const [trade] = await tx.select().from(trades).where(eq(trades.tradeCode, input.tradeCode)).limit(1);
    if (!trade) {
      throw new Error("Trade odasi bulunamadi");
    }

    const isParticipant = trade.buyerUserId === input.reporterUserId || trade.sellerUserId === input.reporterUserId;
    if (!isParticipant) {
      throw new Error("Bu trade icin dispute acma yetkiniz yok");
    }

    const [created] = await tx
      .insert(disputes)
      .values({
        tradeId: trade.id,
        reporterUserId: input.reporterUserId,
        reportedUserId: input.reportedUserId,
        evidencePath: input.evidencePath,
        reason: input.reason,
        status: "open"
      })
      .returning();

    await tx.update(trades).set({ status: "disputed", updatedAt: new Date() }).where(eq(trades.id, trade.id));

    await writeAuditLog({
      action: "dispute.opened",
      context: JSON.stringify({ disputeId: created.id, tradeCode: trade.tradeCode }),
      userId: input.reporterUserId,
      ipAddress: input.ipAddress
    });

    return created;
  });
}

export async function listDisputes(status?: "open" | "resolved" | "rejected"): Promise<Array<typeof disputes.$inferSelect>> {
  if (status) {
    return db.select().from(disputes).where(eq(disputes.status, status));
  }
  return db.select().from(disputes);
}

export async function resolveDispute(input: {
  disputeId: string;
  adminUserId: string;
  decision: "resolved" | "rejected";
  adminDecisionNote: string;
  strikeUserId?: string;
  strikeReason?: string;
  ipAddress?: string;
}): Promise<{ dispute: typeof disputes.$inferSelect; strikeApplied: boolean; banned: boolean }> {
  return db.transaction(async (tx) => {
    const [dispute] = await tx.select().from(disputes).where(and(eq(disputes.id, input.disputeId), eq(disputes.status, "open"))).limit(1);
    if (!dispute) {
      throw new Error("Acik dispute bulunamadi");
    }

    const [updatedDispute] = await tx
      .update(disputes)
      .set({
        status: input.decision,
        adminDecision: input.adminDecisionNote,
        resolvedByAdminId: input.adminUserId,
        resolvedAt: new Date()
      })
      .where(eq(disputes.id, dispute.id))
      .returning();

    let strikeApplied = false;
    let banned = false;

    if (input.decision === "resolved" && input.strikeUserId) {
      strikeApplied = true;
      await tx.insert(strikes).values({
        userId: input.strikeUserId,
        disputeId: dispute.id,
        reason: input.strikeReason ?? "Dispute sonucu haksiz bulundu",
        createdByAdminId: input.adminUserId
      });

      const [target] = await tx.select().from(users).where(eq(users.id, input.strikeUserId)).limit(1);
      if (target) {
        const nextStrike = target.strikeCount + 1;
        banned = nextStrike >= 2;
        await tx
          .update(users)
          .set({
            strikeCount: nextStrike,
            isBanned: banned || target.isBanned,
            updatedAt: new Date()
          })
          .where(eq(users.id, target.id));
      }
    }

    await writeAuditLog({
      action: "dispute.resolved",
      context: JSON.stringify({ disputeId: dispute.id, decision: input.decision, strikeApplied }),
      userId: input.adminUserId,
      ipAddress: input.ipAddress
    });

    return {
      dispute: updatedDispute,
      strikeApplied,
      banned
    };
  });
}
