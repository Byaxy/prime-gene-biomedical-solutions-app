ALTER TABLE "inventory_transactions" ADD COLUMN "quantity_before" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD COLUMN "quantity_after" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_transactions" DROP COLUMN "quantity";