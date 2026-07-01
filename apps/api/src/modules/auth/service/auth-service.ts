import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../../db/client";
import {
  activationTokens,
  authSessions,
  passwordResetTokens,
  refreshTokens,
  users,
  type userRoleEnum
} from "../../../db/schema";
import { writeAuditLog } from "../../audit/service";
import { generateRawToken, hashOpaqueToken, hashPassword, verifyPassword } from "../utils/crypto";

type UserRole = (typeof userRoleEnum.enumValues)[number];

interface ClientMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  nickname: string;
  role: UserRole;
  isBanned: boolean;
}

interface RegisterInput {
  email: string;
  password: string;
  nickname: string;
  role: "user" | "merchant";
  meta: ClientMeta;
}

interface LoginInput {
  email: string;
  password: string;
  meta: ClientMeta;
}

interface RotateInput {
  refreshTokenRaw: string;
  meta: ClientMeta;
}

interface ResetInput {
  email: string;
  meta: ClientMeta;
}

interface ConfirmResetInput {
  resetTokenRaw: string;
  newPassword: string;
  meta: ClientMeta;
}

interface AuthResult {
  user: PublicUser;
  sessionId: string;
}

function toPublicUser(row: typeof users.$inferSelect): PublicUser {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    role: row.role,
    isBanned: row.isBanned
  };
}

function computeExpiry(daysFromNow: number): Date {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}

async function createSession(userId: string, meta: ClientMeta): Promise<string> {
  const sessionId = randomUUID();
  await db.insert(authSessions).values({
    id: sessionId,
    userId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent
  });
  return sessionId;
}

async function createRefreshToken(sessionId: string): Promise<{ raw: string; hash: string }> {
  const raw = generateRawToken();
  const hash = hashOpaqueToken(raw);
  await db.insert(refreshTokens).values({
    sessionId,
    tokenHash: hash,
    expiresAt: computeExpiry(30)
  });
  return { raw, hash };
}

async function revokeTokenByHash(tokenHash: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
}

async function revokeAllSessionTokens(sessionId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.sessionId, sessionId), isNull(refreshTokens.revokedAt)));

  await db
    .update(authSessions)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)));
}

export async function registerUser(input: RegisterInput): Promise<{ user: PublicUser; activationToken: string }> {
  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) {
    throw new Error("Bu e-posta zaten kayitli");
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      nickname: input.nickname,
      role: input.role
    })
    .returning();

  const activationRaw = generateRawToken();
  await db.insert(activationTokens).values({
    userId: user.id,
    tokenHash: hashOpaqueToken(activationRaw),
    expiresAt: computeExpiry(7)
  });

  await writeAuditLog({
    action: "auth.register",
    context: JSON.stringify({ email: input.email, role: input.role }),
    userId: user.id,
    ipAddress: input.meta.ipAddress
  });

  return { user: toPublicUser(user), activationToken: activationRaw };
}

export async function loginUser(input: LoginInput): Promise<AuthResult & { refreshToken: string }> {
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (!user) {
    throw new Error("Kimlik bilgileri hatali");
  }

  const isMatch = await verifyPassword(input.password, user.passwordHash);
  if (!isMatch) {
    throw new Error("Kimlik bilgileri hatali");
  }

  if (user.isBanned) {
    throw new Error("Hesap banli");
  }

  const sessionId = await createSession(user.id, input.meta);
  const { raw } = await createRefreshToken(sessionId);

  await writeAuditLog({
    action: "auth.login",
    context: JSON.stringify({ sessionId }),
    userId: user.id,
    ipAddress: input.meta.ipAddress
  });

  return {
    user: toPublicUser(user),
    sessionId,
    refreshToken: raw
  };
}

export async function rotateRefreshToken(input: RotateInput): Promise<{ user: PublicUser; sessionId: string; refreshToken: string }> {
  const tokenHash = hashOpaqueToken(input.refreshTokenRaw);

  const [tokenRow] = await db
    .select({
      tokenId: refreshTokens.id,
      sessionId: refreshTokens.sessionId,
      expiresAt: refreshTokens.expiresAt,
      revokedAt: refreshTokens.revokedAt,
      userId: authSessions.userId,
      sessionRevokedAt: authSessions.revokedAt
    })
    .from(refreshTokens)
    .innerJoin(authSessions, eq(refreshTokens.sessionId, authSessions.id))
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!tokenRow || tokenRow.revokedAt || tokenRow.sessionRevokedAt || tokenRow.expiresAt < new Date()) {
    throw new Error("Gecersiz refresh token");
  }

  const [user] = await db.select().from(users).where(eq(users.id, tokenRow.userId)).limit(1);
  if (!user || user.isBanned) {
    throw new Error("Kullanici aktif degil");
  }

  await revokeTokenByHash(tokenHash);
  const { raw } = await createRefreshToken(tokenRow.sessionId);

  await writeAuditLog({
    action: "auth.refresh",
    context: JSON.stringify({ sessionId: tokenRow.sessionId }),
    userId: user.id,
    ipAddress: input.meta.ipAddress
  });

  return {
    user: toPublicUser(user),
    sessionId: tokenRow.sessionId,
    refreshToken: raw
  };
}

export async function revokeByRefreshToken(refreshTokenRaw: string, meta: ClientMeta): Promise<void> {
  const tokenHash = hashOpaqueToken(refreshTokenRaw);
  const [tokenRow] = await db
    .select({
      sessionId: refreshTokens.sessionId,
      userId: authSessions.userId
    })
    .from(refreshTokens)
    .innerJoin(authSessions, eq(refreshTokens.sessionId, authSessions.id))
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!tokenRow) {
    return;
  }

  await revokeAllSessionTokens(tokenRow.sessionId);

  await writeAuditLog({
    action: "auth.revoke",
    context: JSON.stringify({ sessionId: tokenRow.sessionId }),
    userId: tokenRow.userId,
    ipAddress: meta.ipAddress
  });
}

export async function requestPasswordReset(input: ResetInput): Promise<{ resetToken?: string }> {
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (!user) {
    return {};
  }

  const raw = generateRawToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashOpaqueToken(raw),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000)
  });

  await writeAuditLog({
    action: "auth.password_reset_requested",
    context: JSON.stringify({ userId: user.id }),
    userId: user.id,
    ipAddress: input.meta.ipAddress
  });

  return { resetToken: raw };
}

export async function confirmPasswordReset(input: ConfirmResetInput): Promise<void> {
  const tokenHash = hashOpaqueToken(input.resetTokenRaw);
  const [tokenRow] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.consumedAt), gt(passwordResetTokens.expiresAt, new Date())))
    .limit(1);

  if (!tokenRow) {
    throw new Error("Reset token gecersiz veya suresi dolmus");
  }

  const newHash = await hashPassword(input.newPassword);
  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, tokenRow.userId));

  await db
    .update(passwordResetTokens)
    .set({ consumedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenRow.id));

  const [session] = await db
    .select()
    .from(authSessions)
    .where(eq(authSessions.userId, tokenRow.userId))
    .limit(1);

  if (session) {
    await revokeAllSessionTokens(session.id);
  }

  await writeAuditLog({
    action: "auth.password_reset_confirmed",
    context: JSON.stringify({ userId: tokenRow.userId }),
    userId: tokenRow.userId,
    ipAddress: input.meta.ipAddress
  });
}

export async function activateByToken(rawToken: string, meta: ClientMeta): Promise<void> {
  const tokenHash = hashOpaqueToken(rawToken);
  const [tokenRow] = await db
    .select()
    .from(activationTokens)
    .where(and(eq(activationTokens.tokenHash, tokenHash), isNull(activationTokens.consumedAt), gt(activationTokens.expiresAt, new Date())))
    .limit(1);

  if (!tokenRow) {
    throw new Error("Aktivasyon token gecersiz veya suresi dolmus");
  }

  await db
    .update(activationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(activationTokens.id, tokenRow.id));

  await writeAuditLog({
    action: "auth.activated",
    context: JSON.stringify({ userId: tokenRow.userId }),
    userId: tokenRow.userId,
    ipAddress: meta.ipAddress
  });
}
