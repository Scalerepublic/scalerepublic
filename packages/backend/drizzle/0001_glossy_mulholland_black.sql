CREATE TYPE "public"."portfolio_status" AS ENUM('ACTIVE', 'DEFAULTED');--> statement-breakpoint
CREATE TYPE "public"."auto_trade_rule_status" AS ENUM('ACTIVE', 'TRIGGERED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."auto_trade_rule_type" AS ENUM('BUY', 'SELL');--> statement-breakpoint
CREATE TYPE "public"."trade_status" AS ENUM('PENDING', 'EXECUTED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."trade_type" AS ENUM('BUY', 'SELL');--> statement-breakpoint
CREATE TABLE "portfolio" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"cash_balance" numeric(18, 2) NOT NULL,
	"starting_capital" numeric(18, 2) NOT NULL,
	"status" "portfolio_status" DEFAULT 'ACTIVE' NOT NULL,
	"defaulted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "stock_price" (
	"id" text PRIMARY KEY NOT NULL,
	"stock_id" text NOT NULL,
	"price" numeric(18, 4) NOT NULL,
	"source" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock" (
	"id" text PRIMARY KEY NOT NULL,
	"ticker" text NOT NULL,
	"company_name" text NOT NULL,
	"exchange" text NOT NULL,
	"currency" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "sync_job" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"last_started_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	"locked_at" timestamp with time zone,
	"locked_by" text
);
--> statement-breakpoint
CREATE TABLE "auto_trade_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text NOT NULL,
	"stock_id" text NOT NULL,
	"rule_type" "auto_trade_rule_type" NOT NULL,
	"price_threshold" numeric(18, 4) NOT NULL,
	"quantity" integer NOT NULL,
	"status" "auto_trade_rule_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp,
	"triggered_trade_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade" (
	"id" text PRIMARY KEY NOT NULL,
	"portfolio_id" text NOT NULL,
	"stock_id" text NOT NULL,
	"trade_type" "trade_type" NOT NULL,
	"quantity" integer NOT NULL,
	"executed_price" numeric(18, 4) NOT NULL,
	"status" "trade_status" DEFAULT 'PENDING' NOT NULL,
	"executed_at" timestamp,
	"auto_trade_rule_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"cash_balance" integer DEFAULT 100000 NOT NULL,
	"is_defaulted" boolean DEFAULT false NOT NULL,
	"defaulted_at" timestamp,
	"penalty_counter" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DROP TABLE "example_items" CASCADE;--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_price" ADD CONSTRAINT "stock_price_stock_id_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_trade_rule" ADD CONSTRAINT "auto_trade_rule_portfolio_id_portfolio_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auto_trade_rule" ADD CONSTRAINT "auto_trade_rule_stock_id_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade" ADD CONSTRAINT "trade_portfolio_id_portfolio_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolio"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade" ADD CONSTRAINT "trade_stock_id_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portfolio_user_id_idx" ON "portfolio" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portfolio_status_idx" ON "portfolio" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_price_stock_recorded_uniq" ON "stock_price" USING btree ("stock_id","recorded_at");--> statement-breakpoint
CREATE INDEX "stock_price_recorded_at_idx" ON "stock_price" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "stock_price_source_idx" ON "stock_price" USING btree ("source");--> statement-breakpoint
CREATE INDEX "stock_ticker_idx" ON "stock" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "auto_trade_rule_stock_status_idx" ON "auto_trade_rule" USING btree ("stock_id","status");--> statement-breakpoint
CREATE INDEX "auto_trade_rule_portfolio_id_idx" ON "auto_trade_rule" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "trade_portfolio_id_idx" ON "trade" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "trade_stock_id_idx" ON "trade" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "trade_created_at_idx" ON "trade" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "trade_status_idx" ON "trade" USING btree ("status");