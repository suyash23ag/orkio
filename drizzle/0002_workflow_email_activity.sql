CREATE TABLE IF NOT EXISTS "workflow_email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"workflow_id" uuid,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider_message_id" text,
	"last_error" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_email_logs" ADD CONSTRAINT "workflow_email_logs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_email_logs_org_created_idx" ON "workflow_email_logs" USING btree ("org_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workflow_email_logs_idempotency_key_unique" ON "workflow_email_logs" USING btree ("idempotency_key");
