CREATE TYPE "public"."notification_kind" AS ENUM('bid_received', 'auction_extended', 'trade_matched', 'trade_status_changed', 'dispute_opened', 'strike_received');--> statement-breakpoint
CREATE TYPE "public"."price_event_type" AS ENUM('bid', 'sale');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" text NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "price_history_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid,
	"bid_id" uuid,
	"trade_id" uuid,
	"item_name" varchar(100) NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"server_name" varchar(50) NOT NULL,
	"camp" integer NOT NULL,
	"event_type" "price_event_type" NOT NULL,
	"amount_gb" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history_events" ADD CONSTRAINT "price_history_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history_events" ADD CONSTRAINT "price_history_events_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history_events" ADD CONSTRAINT "price_history_events_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "price_history_item_idx" ON "price_history_events" USING btree ("item_name","server_name","camp","created_at");--> statement-breakpoint
CREATE INDEX "price_history_type_idx" ON "price_history_events" USING btree ("event_type","created_at");