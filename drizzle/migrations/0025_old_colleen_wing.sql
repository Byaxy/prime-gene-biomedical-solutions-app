CREATE TABLE "sale_item_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"inventory_stock_id" uuid NOT NULL,
	"lot_number" text NOT NULL,
	"quantity_to_take" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sale_item_inventory_sale_item_id_inventory_stock_id_unique" UNIQUE("sale_item_id","inventory_stock_id")
);
--> statement-breakpoint
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_inventory_stock_id_inventory_id_fk";
--> statement-breakpoint
ALTER TABLE "sale_item_inventory" ADD CONSTRAINT "sale_item_inventory_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_item_inventory" ADD CONSTRAINT "sale_item_inventory_inventory_stock_id_inventory_id_fk" FOREIGN KEY ("inventory_stock_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" DROP COLUMN "inventory_stock_id";--> statement-breakpoint
ALTER TABLE "sale_items" DROP COLUMN "lot_number";