ALTER TABLE "sales" ALTER COLUMN "quotation_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "quotation_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;