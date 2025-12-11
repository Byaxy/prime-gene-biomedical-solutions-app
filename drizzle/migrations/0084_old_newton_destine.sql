DROP INDEX IF EXISTS "products_quantity_idx";--> statement-breakpoint
ALTER TABLE "backorders" ADD COLUMN "original_pending_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN IF EXISTS "quantity";