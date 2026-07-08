CREATE INDEX "stock_backfill_requested_at_idx" ON "stock" USING btree ("backfill_requested_at" desc nulls last);
