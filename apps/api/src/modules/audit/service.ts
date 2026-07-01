import { db } from "../../db/client";
import { auditLogs } from "../../db/schema";

interface AuditInput {
  action: string;
  context: string;
  userId?: string;
  ipAddress?: string;
}

export async function writeAuditLog(input: AuditInput): Promise<void> {
  await db.insert(auditLogs).values({
    action: input.action,
    context: input.context,
    userId: input.userId,
    ipAddress: input.ipAddress
  });
}
