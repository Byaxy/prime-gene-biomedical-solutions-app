CREATE TYPE "public"."shipping_status" AS ENUM('not_shipped', 'shipped', 'received');--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"cost_price" numeric(12, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"product_name" text,
	"product_ID" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_number" text NOT NULL,
	"vendor_id" uuid NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"purchase_order_date" timestamp NOT NULL,
	"status" "purchase_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"is_converted_to_purchase" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_purchase_order_number_unique" UNIQUE("purchase_order_number")
);
--> statement-breakpoint
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_purchase_order_number_unique";--> statement-breakpoint
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_vendor_id_vendors_id_fk";
--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "purchase_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "vendor_invoice_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "shipping_status" "shipping_status" DEFAULT 'not_shipped' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "amount_paid" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "payment_status" "payment_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" DROP COLUMN "purchase_order_number";--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_purchase_number_unique" UNIQUE("purchase_number");