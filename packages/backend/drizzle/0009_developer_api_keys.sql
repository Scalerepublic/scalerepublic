CREATE TYPE "public"."api_key_scope" AS ENUM('read', 'trade');--> statement-breakpoint
CREATE TABLE "developer_account" (
	"user_id" text PRIMARY KEY NOT NULL,
	"enabled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"hashed_key" text NOT NULL,
	"scopes" "api_key_scope"[] NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"request_window_started_at" timestamp,
	"request_window_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_key_hashed_key_unique" UNIQUE("hashed_key")
);
--> statement-breakpoint
ALTER TABLE "developer_account" ADD CONSTRAINT "developer_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_user_id_idx" ON "api_key" USING btree ("user_id");
