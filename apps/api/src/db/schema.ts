import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "merchant", "admin"]);
export const listingTypeEnum = pgEnum("listing_type", ["auction", "buy_now"]);
export const listingStatusEnum = pgEnum("listing_status", ["active", "sold", "passive", "expired"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nickname: varchar("nickname", { length: 24 }).notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  strikeCount: integer("strike_count").notNull().default(0),
  isBanned: boolean("is_banned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email)
}));

export const listings = pgTable("listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  sellerUserId: uuid("seller_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  itemName: varchar("item_name", { length: 100 }).notNull(),
  itemType: varchar("item_type", { length: 50 }).notNull(),
  serverName: varchar("server_name", { length: 50 }).notNull().default("Zero"),
  camp: integer("camp").notNull(),
  listingType: listingTypeEnum("listing_type").notNull(),
  status: listingStatusEnum("status").notNull().default("active"),
  currentBidGb: integer("current_bid_gb"),
  buyNowGb: integer("buy_now_gb"),
  endAt: timestamp("end_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  statusIdx: index("listings_status_idx").on(table.status),
  serverIdx: index("listings_server_idx").on(table.serverName),
  feedIdx: index("listings_feed_idx").on(table.status, table.createdAt, table.id)
}));

export const bids = pgTable("bids", {
  id: uuid("id").defaultRandom().primaryKey(),
  listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  bidderUserId: uuid("bidder_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  amountGb: integer("amount_gb").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  listingIdx: index("bids_listing_idx").on(table.listingId, table.createdAt),
  bidderIdx: index("bids_bidder_idx").on(table.bidderUserId)
}));

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 64 }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userIdx: index("auth_sessions_user_idx").on(table.userId)
}));

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => authSessions.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  sessionIdx: index("refresh_tokens_session_idx").on(table.sessionId)
}));

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userIdx: index("password_reset_tokens_user_idx").on(table.userId)
}));

export const activationTokens = pgTable("activation_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userIdx: index("activation_tokens_user_idx").on(table.userId)
}));

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 100 }).notNull(),
  context: text("context").notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  actionIdx: index("audit_logs_action_idx").on(table.action)
}));
