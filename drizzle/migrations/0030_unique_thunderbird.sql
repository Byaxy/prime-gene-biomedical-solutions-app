CREATE TABLE "delivery_item_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_item_id" uuid NOT NULL,
	"inventory_stock_id" uuid NOT NULL,
	"lot_number" text NOT NULL,
	"quantity_taken" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliveries" DROP CONSTRAINT "deliveries_quotation_id_quotations_id_fk";
--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "delivered_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "received_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "delivery_address" jsonb DEFAULT '{"addressName":"","address":"","city":"","state":"","country":"","email":"","phone":""}'::jsonb;--> statement-breakpoint
ALTER TABLE "delivery_items" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "delivery_items" ADD COLUMN "product_ID" text;--> statement-breakpoint
ALTER TABLE "delivery_item_inventory" ADD CONSTRAINT "delivery_item_inventory_delivery_item_id_delivery_items_id_fk" FOREIGN KEY ("delivery_item_id") REFERENCES "public"."delivery_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_item_inventory" ADD CONSTRAINT "delivery_item_inventory_inventory_stock_id_inventory_id_fk" FOREIGN KEY ("inventory_stock_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "deliveries" DROP COLUMN "quotation_id";