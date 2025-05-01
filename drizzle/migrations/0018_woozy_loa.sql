ALTER TABLE "products" DROP CONSTRAINT "products_tax_rate_id_tax_rates_id_fk";
--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "tax_rate_id";