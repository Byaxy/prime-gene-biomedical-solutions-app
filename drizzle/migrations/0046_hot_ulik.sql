CREATE TABLE "receiving_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receiving_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"purchase_item_id" uuid NOT NULL,
	"lot_number" text NOT NULL,
	"quantity_received" integer NOT NULL,
	"cost_price" numeric(12, 2) NOT NULL,
	"selling_price" numeric(12, 2) NOT NULL,
	"manufacture_date" timestamp,
	"expiry_date" timestamp,
	"total_cost" numeric(12, 2) NOT NULL,
	"product_name" text,
	"product_ID" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receiving" DROP CONSTRAINT "receiving_purchase_item_id_purchase_items_id_fk";
--> statement-breakpoint
ALTER TABLE "receiving" ADD COLUMN "vendor_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "receiving" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "receiving" ADD COLUMN "receiving_order_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "receiving" ADD COLUMN "receiving_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "receiving" ADD COLUMN "total_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "receiving" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_receiving_id_receiving_id_fk" FOREIGN KEY ("receiving_id") REFERENCES "public"."receiving"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_purchase_item_id_purchase_items_id_fk" FOREIGN KEY ("purchase_item_id") REFERENCES "public"."purchase_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving" ADD CONSTRAINT "receiving_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving" ADD CONSTRAINT "receiving_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving" DROP COLUMN "purchase_item_id";--> statement-breakpoint
ALTER TABLE "receiving" DROP COLUMN "lot_number";--> statement-breakpoint
ALTER TABLE "receiving" DROP COLUMN "quantity_received";--> statement-breakpoint
ALTER TABLE "receiving" DROP COLUMN "cost_price";--> statement-breakpoint
ALTER TABLE "receiving" DROP COLUMN "manufacture_date";--> statement-breakpoint
ALTER TABLE "receiving" DROP COLUMN "expiry_date";--> statement-breakpoint
ALTER TABLE "receiving" DROP COLUMN "received_date";--> statement-breakpoint
ALTER TABLE "receiving" ADD CONSTRAINT "receiving_receiving_order_number_unique" UNIQUE("receiving_order_number");