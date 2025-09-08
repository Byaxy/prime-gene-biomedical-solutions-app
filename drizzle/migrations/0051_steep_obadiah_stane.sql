ALTER TABLE "sales" ALTER COLUMN "quotation_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "quotation_id" SET DATA TYPE uuid USING 
  CASE 
    WHEN quotation_id IS NULL OR quotation_id = '' THEN NULL
    WHEN quotation_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN quotation_id::uuid
    ELSE NULL
  END;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;