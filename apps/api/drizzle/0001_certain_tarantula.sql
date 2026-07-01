CREATE TABLE "bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"bidder_user_id" uuid NOT NULL,
	"amount_gb" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidder_user_id_users_id_fk" FOREIGN KEY ("bidder_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bids_listing_idx" ON "bids" USING btree ("listing_id","created_at");--> statement-breakpoint
CREATE INDEX "bids_bidder_idx" ON "bids" USING btree ("bidder_user_id");--> statement-breakpoint
CREATE INDEX "listings_feed_idx" ON "listings" USING btree ("status","created_at","id");