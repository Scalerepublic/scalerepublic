ALTER TABLE "portfolio" DROP CONSTRAINT "portfolio_user_id_unique";--> statement-breakpoint
CREATE INDEX "portfolio_user_id_status_idx" ON "portfolio" USING btree ("user_id","status");