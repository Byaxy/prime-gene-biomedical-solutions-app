CREATE TABLE "waybill_item_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"waybill_item_id" uuid NOT NULL,
	"inventory_stock_id" uuid NOT NULL,
	"lot_number" text NOT NULL,
	"quantity_taken" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"sub_total" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promissory_notes" RENAME COLUMN "promissory_note_number" TO "promissory_note_ref_number";--> statement-breakpoint
ALTER TABLE "waybills" RENAME COLUMN "waybill_number" TO "waybill_ref_number";--> statement-breakpoint
ALTER TABLE "promissory_notes" DROP CONSTRAINT "promissory_notes_promissory_note_number_unique";--> statement-breakpoint
ALTER TABLE "waybills" DROP CONSTRAINT "waybills_waybill_number_unique";--> statement-breakpoint
ALTER TABLE "promissory_notes" DROP CONSTRAINT "promissory_notes_delivery_id_deliveries_id_fk";
--> statement-breakpoint
ALTER TABLE "promissory_notes" DROP CONSTRAINT "promissory_notes_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "promissory_notes" DROP CONSTRAINT "promissory_notes_sales_id_sales_id_fk";
--> statement-breakpoint
ALTER TABLE "waybills" DROP CONSTRAINT "waybills_from_store_id_stores_id_fk";
--> statement-breakpoint
ALTER TABLE "waybills" DROP CONSTRAINT "waybills_delivery_id_deliveries_id_fk";
--> statement-breakpoint
ALTER TABLE "waybills" DROP CONSTRAINT "waybills_sale_id_sales_id_fk";
--> statement-breakpoint
ALTER TABLE "waybills" ALTER COLUMN "delivery_address" SET DATA TYPE jsonb USING 
  COALESCE(
    NULLIF(delivery_address, '')::jsonb,
    '{"addressName":"","address":"","city":"","state":"","country":"","email":"","phone":""}'::jsonb
  );--> statement-breakpoint
ALTER TABLE "waybills" ALTER COLUMN "delivery_address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD COLUMN "waybill_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "waybill_items" ADD COLUMN "quantity_requested" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "waybill_items" ADD COLUMN "quantity_supplied" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "waybill_items" ADD COLUMN "balance_left" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "waybill_items" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "waybill_items" ADD COLUMN "product_ID" text;--> statement-breakpoint
ALTER TABLE "waybills" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "waybills" ADD COLUMN "delivered_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "waybills" ADD COLUMN "received_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "waybill_item_inventory" ADD CONSTRAINT "waybill_item_inventory_waybill_item_id_waybill_items_id_fk" FOREIGN KEY ("waybill_item_id") REFERENCES "public"."waybill_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waybill_item_inventory" ADD CONSTRAINT "waybill_item_inventory_inventory_stock_id_inventory_id_fk" FOREIGN KEY ("inventory_stock_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD CONSTRAINT "promissory_notes_waybill_id_waybills_id_fk" FOREIGN KEY ("waybill_id") REFERENCES "public"."waybills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD CONSTRAINT "promissory_notes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD CONSTRAINT "promissory_notes_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promissory_note_items" DROP COLUMN "lot_number";--> statement-breakpoint
ALTER TABLE "promissory_notes" DROP COLUMN "delivery_id";--> statement-breakpoint
ALTER TABLE "waybill_items" DROP COLUMN "lot_number";--> statement-breakpoint
ALTER TABLE "waybill_items" DROP COLUMN "quantity";--> statement-breakpoint
ALTER TABLE "waybill_items" DROP COLUMN "unit_price";--> statement-breakpoint
ALTER TABLE "waybill_items" DROP COLUMN "sub_total";--> statement-breakpoint
ALTER TABLE "waybills" DROP COLUMN "from_store_id";--> statement-breakpoint
ALTER TABLE "waybills" DROP COLUMN "transportation_fee";--> statement-breakpoint
ALTER TABLE "waybills" DROP COLUMN "total_amount";--> statement-breakpoint
ALTER TABLE "waybills" DROP COLUMN "delivery_id";--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD CONSTRAINT "promissory_notes_promissory_note_ref_number_unique" UNIQUE("promissory_note_ref_number");--> statement-breakpoint
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_waybill_ref_number_unique" UNIQUE("waybill_ref_number");