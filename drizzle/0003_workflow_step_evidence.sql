CREATE TABLE IF NOT EXISTS "workflow_step_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" text NOT NULL,
  "workflow_id" uuid,
  "run_id" text NOT NULL,
  "node_id" text NOT NULL,
  "node_type" text NOT NULL,
  "attempt" integer NOT NULL,
  "phase" text NOT NULL,
  "status" text NOT NULL,
  "message" text,
  "input_summary" text,
  "output_summary" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_step_evidence" ADD CONSTRAINT "workflow_step_evidence_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_step_evidence_run_idx" ON "workflow_step_evidence" USING btree ("org_id","workflow_id","run_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_step_evidence_created_idx" ON "workflow_step_evidence" USING btree ("org_id","created_at");
