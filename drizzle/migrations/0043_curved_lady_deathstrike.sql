ALTER TYPE "public"."waybill_type" ADD VALUE 'conversion';--> statement-breakpoint
ALTER TABLE "waybills" DROP CONSTRAINT "waybills_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "waybills" ADD COLUMN "original_loan_waybill_id" uuid;--> statement-breakpoint
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_original_loan_waybill_id_waybills_id_fk" FOREIGN KEY ("original_loan_waybill_id") REFERENCES "public"."waybills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;