DROP TABLE "delivery_item_inventory" CASCADE;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "is_delivery_note_created" boolean DEFAULT false NOT NULL;