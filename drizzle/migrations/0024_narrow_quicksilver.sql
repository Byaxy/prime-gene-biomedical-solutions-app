ALTER TYPE "public"."transaction_type" ADD VALUE 'sale_reversal' BEFORE 'transfer';--> statement-breakpoint
ALTER TABLE "sale_items" ALTER COLUMN "lot_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" DROP COLUMN "available_quantity";