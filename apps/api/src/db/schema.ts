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
  serverIdx: index("listings_server_idx").on(table.serverName)
}));
