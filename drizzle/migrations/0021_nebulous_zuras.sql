ALTER TABLE "sale_items" ADD COLUMN "inventory_stock_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "tax_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "available_quantity" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "unit_price" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "sub_total" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "tax_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "tax_rate" numeric(12, 2) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "discount_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "discount_rate" numeric(12, 2) DEFAULT 0;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "product_ID" text;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "sub_total" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "total_tax_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "discount_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "is_delivery_address_added" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "delivery_address" jsonb DEFAULT '{"addressName":"","address":"","city":"","state":"","country":"","email":"","phone":""}'::jsonb;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_inventory_stock_id_inventory_id_fk" FOREIGN KEY ("inventory_stock_id") REFERENCES "public"."inventory"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_tax_id_tax_rates_id_fk" FOREIGN KEY ("tax_id") REFERENCES "public"."tax_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" DROP COLUMN "selling_price";