ALTER TABLE "payments_received" ADD COLUMN "check_number" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "payments_received" ADD COLUMN "check_bank_name" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "payments_received" ADD COLUMN "check_date" timestamp DEFAULT NULL;