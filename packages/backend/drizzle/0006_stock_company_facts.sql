ALTER TABLE "stock" ADD COLUMN "wikidata_id" text;--> statement-breakpoint
ALTER TABLE "stock" ADD COLUMN "company_facts" jsonb;--> statement-breakpoint
ALTER TABLE "stock" ADD COLUMN "company_facts_updated_at" timestamp with time zone;
