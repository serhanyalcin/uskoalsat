CREATE TYPE "public"."trade_reason" AS ENUM('auction_end', 'buy_now');--> statement-breakpoint
CREATE TYPE "public"."trade_status" AS ENUM('pending', 'in_progress', 'completed', 'disputed', 'cancelled');--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"seller_user_id" uuid NOT NULL,
	"buyer_user_id" uuid NOT NULL,
	"winning_bid_id" uuid,
	"trade_code" varchar(24) NOT NULL,
	"reason" "trade_reason" NOT NULL,
	"status" "trade_status" DEFAULT 'pending' NOT NULL,
	"server_name" varchar(50) NOT NULL,
	"camp" integer NOT NULL,
	"buyer_game_nick" varchar(24) NOT NULL,
	"seller_game_nick" varchar(24) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trades_listing_id_unique" UNIQUE("listing_id"),
	CONSTRAINT "trades_trade_code_unique" UNIQUE("trade_code")
);
--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_winning_bid_id_bids_id_fk" FOREIGN KEY ("winning_bid_id") REFERENCES "public"."bids"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trades_code_idx" ON "trades" USING btree ("trade_code");--> statement-breakpoint
CREATE INDEX "trades_buyer_idx" ON "trades" USING btree ("buyer_user_id");--> statement-breakpoint
CREATE INDEX "trades_seller_idx" ON "trades" USING btree ("seller_user_id");