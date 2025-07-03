CREATE TYPE "public"."waybill_conversion_status" AS ENUM('pending', 'partial', 'full');--> statement-breakpoint
ALTER TABLE "waybills" DROP CONSTRAINT "waybills_original_loan_waybill_id_waybills_id_fk";
--> statement-breakpoint
ALTER TABLE "waybills" ADD COLUMN "conversion_date" timestamp;--> statement-breakpoint
ALTER TABLE "waybills" ADD COLUMN "conversion_status" "waybill_conversion_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "waybills" DROP COLUMN "original_loan_waybill_id";