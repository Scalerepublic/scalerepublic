CREATE TABLE "market_state" (
	"id" text PRIMARY KEY NOT NULL,
	"day_offset" integer DEFAULT 0 NOT NULL,
	"ticks_on_current_day" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
