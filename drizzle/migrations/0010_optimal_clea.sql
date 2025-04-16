ALTER TABLE "products" ALTER COLUMN "alert_quantity" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "alert_quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "max_alert_quantity" integer DEFAULT 5;