CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"host_user_id" text NOT NULL,
	"invitee_name" text NOT NULL,
	"invitee_email" text NOT NULL,
	"purpose" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"idempotency_key" text NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_org_created_idx" ON "appointments" USING btree ("org_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_request_key_unique" ON "appointments" USING btree ("org_id","idempotency_key");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_active_slot_unique" ON "appointments" USING btree ("org_id","host_user_id","starts_at") WHERE "appointments"."status" = 'confirmed';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_email_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL REFERENCES "appointments"("id") ON DELETE cascade,
	"kind" text DEFAULT 'confirmation' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider_message_id" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appointment_email_jobs_appointment_kind_unique" ON "appointment_email_jobs" USING btree ("appointment_id","kind");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_email_jobs_status_idx" ON "appointment_email_jobs" USING btree ("status");
