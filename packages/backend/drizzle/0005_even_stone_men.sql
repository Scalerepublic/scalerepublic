CREATE TYPE "public"."auto_trade_trigger_direction" AS ENUM('AT_OR_ABOVE', 'AT_OR_BELOW');--> statement-breakpoint
ALTER TABLE "auto_trade_rule" ADD COLUMN "trigger_direction" "auto_trade_trigger_direction";--> statement-breakpoint
UPDATE "auto_trade_rule" SET "trigger_direction" = (CASE WHEN "rule_type" = 'BUY' THEN 'AT_OR_BELOW' ELSE 'AT_OR_ABOVE' END)::"auto_trade_trigger_direction";--> statement-breakpoint
ALTER TABLE "auto_trade_rule" ALTER COLUMN "trigger_direction" SET NOT NULL;
