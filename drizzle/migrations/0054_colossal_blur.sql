ALTER TABLE "receiving" DROP CONSTRAINT "receiving_receiving_order_number_unique";--> statement-breakpoint
ALTER TABLE "receiving" ADD COLUMN "vendor_parking_list_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "receiving" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "receiving" DROP COLUMN "receiving_order_number";