ALTER TABLE "sales" DROP CONSTRAINT "sales_quotation_id_quotations_id_fk";
--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "quotation_id";