DROP TABLE "commission_recipient_sales" CASCADE;--> statement-breakpoint
ALTER TABLE "commission_sales" ADD COLUMN "withholding_tax_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_sales" ADD COLUMN "base_for_commission" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_sales" ADD COLUMN "gross_commission" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_sales" ADD COLUMN "commission_payable" numeric(12, 2) NOT NULL;