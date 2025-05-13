ALTER TABLE "sales" DROP CONSTRAINT "sales_quotation_id_quotations_id_fk";
--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "quotation_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "quotation_id" SET DEFAULT '';