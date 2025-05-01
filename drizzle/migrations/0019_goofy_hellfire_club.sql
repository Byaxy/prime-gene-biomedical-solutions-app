ALTER TABLE "quotations" DROP CONSTRAINT "quotations_tax_id_tax_rates_id_fk";
--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "tax_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "sub_total" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_tax_id_tax_rates_id_fk" FOREIGN KEY ("tax_id") REFERENCES "public"."tax_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" DROP COLUMN "tax_id";--> statement-breakpoint
ALTER TABLE "quotations" DROP COLUMN "discount_rate";