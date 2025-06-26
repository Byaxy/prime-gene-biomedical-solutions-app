CREATE TYPE "public"."waybill_type" AS ENUM('sale', 'loan');--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'loan' BEFORE 'sale_reversal';--> statement-breakpoint
ALTER TABLE "waybill_items" ALTER COLUMN "sale_item_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "waybills" ADD COLUMN "waybill_type" "waybill_type" DEFAULT 'sale';--> statement-breakpoint
ALTER TABLE "waybills" ADD COLUMN "original_loan_waybill_id" uuid;--> statement-breakpoint
ALTER TABLE "waybills" ADD COLUMN "is_converted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_original_loan_waybill_id_waybills_id_fk" FOREIGN KEY ("original_loan_waybill_id") REFERENCES "public"."waybills"("id") ON DELETE set null ON UPDATE no action;