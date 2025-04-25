ALTER TABLE "quotation_items" ADD COLUMN "sub_total" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "discount_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "discount_rate" numeric(12, 2) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "tax_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "discount_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "discount_rate" numeric(12, 2) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "image_id" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_tax_id_tax_rates_id_fk" FOREIGN KEY ("tax_id") REFERENCES "public"."tax_rates"("id") ON DELETE set null ON UPDATE no action;