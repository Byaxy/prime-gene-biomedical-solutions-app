CREATE TABLE "receiving_items_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receiving_item_id" uuid NOT NULL,
	"lot_number" text NOT NULL,
	"quantity" integer NOT NULL,
	"manufacture_date" timestamp,
	"expiry_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receiving_items_inventory" ADD CONSTRAINT "receiving_items_inventory_receiving_item_id_receiving_items_id_fk" FOREIGN KEY ("receiving_item_id") REFERENCES "public"."receiving_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_items" DROP COLUMN "lot_number";--> statement-breakpoint
ALTER TABLE "receiving_items" DROP COLUMN "quantity_received";--> statement-breakpoint
ALTER TABLE "receiving_items" DROP COLUMN "manufacture_date";--> statement-breakpoint
ALTER TABLE "receiving_items" DROP COLUMN "expiry_date";