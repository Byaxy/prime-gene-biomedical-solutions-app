ALTER TABLE "quotation_items" DROP CONSTRAINT "quotation_items_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "unit_price" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "tax_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "tax_rate" numeric(12, 2) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD COLUMN "product_ID" text;--> statement-breakpoint
ALTER TABLE "quotations" ADD COLUMN "total_tax_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "quotation_items" DROP COLUMN "store_id";--> statement-breakpoint
ALTER TABLE "quotation_items" DROP COLUMN "lot_number";--> statement-breakpoint
ALTER TABLE "quotation_items" DROP COLUMN "selling_price";--> statement-breakpoint
ALTER TABLE "quotation_items" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "quotation_items" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "quotations" DROP COLUMN "store_id";--> statement-breakpoint
ALTER TABLE "quotations" DROP COLUMN "amount_paid";--> statement-breakpoint
ALTER TABLE "quotations" DROP COLUMN "payment_method";