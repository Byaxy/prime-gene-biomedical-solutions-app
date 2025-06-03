CREATE TABLE "backorder_fulfillments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backorder_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"fulfilled_quantity" integer NOT NULL,
	"fulfillment_date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backorders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"pending_quantity" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "backorders_product_id_store_id_sale_item_id_unique" UNIQUE("product_id","store_id","sale_item_id")
);
--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "has_backorder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "backorder_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "fulfilled_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "backorder_fulfillments" ADD CONSTRAINT "backorder_fulfillments_backorder_id_backorders_id_fk" FOREIGN KEY ("backorder_id") REFERENCES "public"."backorders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backorder_fulfillments" ADD CONSTRAINT "backorder_fulfillments_inventory_id_inventory_id_fk" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backorders" ADD CONSTRAINT "backorders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backorders" ADD CONSTRAINT "backorders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backorders" ADD CONSTRAINT "backorders_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE cascade ON UPDATE no action;