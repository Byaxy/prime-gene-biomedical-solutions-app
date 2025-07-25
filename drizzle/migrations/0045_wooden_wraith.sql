ALTER TABLE "purchase_items" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "product_ID" text;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD COLUMN "quantity_received" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN "amount_paid";--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN "payment_method";--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN "payment_status";--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN "delivery_status";