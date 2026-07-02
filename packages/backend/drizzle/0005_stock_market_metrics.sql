ALTER TABLE "stock" ADD COLUMN "period_change_percent" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "stock" ADD COLUMN "day_change_percent" numeric(10, 4);--> statement-breakpoint
ALTER TABLE "stock" ADD COLUMN "metrics_updated_at" timestamp with time zone;
