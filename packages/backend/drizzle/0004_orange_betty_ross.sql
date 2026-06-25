CREATE TABLE "stock_daily_bar" (
	"id" text PRIMARY KEY NOT NULL,
	"stock_id" text NOT NULL,
	"trading_date" date NOT NULL,
	"open" numeric(18, 4) NOT NULL,
	"high" numeric(18, 4) NOT NULL,
	"low" numeric(18, 4) NOT NULL,
	"close" numeric(18, 4) NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stock" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "stock" ADD COLUMN "is_accumulating" boolean;--> statement-breakpoint
ALTER TABLE "stock_daily_bar" ADD CONSTRAINT "stock_daily_bar_stock_id_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_daily_bar_stock_date_uniq" ON "stock_daily_bar" USING btree ("stock_id","trading_date");--> statement-breakpoint
CREATE INDEX "stock_daily_bar_stock_id_idx" ON "stock_daily_bar" USING btree ("stock_id");