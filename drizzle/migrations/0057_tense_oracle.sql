CREATE TYPE "public"."carrier_type" AS ENUM('ExpressCargo', 'AirCargo', 'SeaCargo');--> statement-breakpoint
CREATE TYPE "public"."package_type" AS ENUM('Box', 'Carton', 'Crate', 'Pallet', 'Bag', 'Drum', 'Roll');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('pending', 'in_transit', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shipper_type" AS ENUM('vendor', 'courier');--> statement-breakpoint
CREATE TYPE "public"."shipping_mode" AS ENUM('express', 'air', 'sea');--> statement-breakpoint
CREATE TABLE "parcel_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcel_id" uuid,
	"product_id" uuid,
	"quantity" integer NOT NULL,
	"product_name" text,
	"product_ID" text,
	"product_unit" text,
	"net_weight" numeric(12, 2) NOT NULL,
	"is_purchase_item" boolean NOT NULL,
	"purchase_reference" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid,
	"parcel_number" text NOT NULL,
	"package_type" "package_type" NOT NULL,
	"length" numeric(12, 2) NOT NULL,
	"width" numeric(12, 2) NOT NULL,
	"height" numeric(12, 2) NOT NULL,
	"net_weight" numeric(12, 2) NOT NULL,
	"gross_weight" numeric(12, 2) NOT NULL,
	"volumetric_weight" numeric(12, 2) NOT NULL,
	"chargeable_weight" numeric(12, 2) NOT NULL,
	"volumetric_divisor" numeric(12, 2) NOT NULL,
	"unit_price_per_kg" numeric(12, 2) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_ref_number" text NOT NULL,
	"number_of_packages" integer NOT NULL,
	"total_items" integer NOT NULL,
	"shipping_mode" "shipping_mode" NOT NULL,
	"shipper_type" "shipper_type" NOT NULL,
	"shipping_vendor_id" uuid,
	"shipper_name" text,
	"shipper_address" text,
	"carrier_type" "carrier_type" NOT NULL,
	"carrier_name" text NOT NULL,
	"tracking_number" text NOT NULL,
	"shipping_date" timestamp NOT NULL,
	"estimated_arrival_date" timestamp,
	"date_shipped" timestamp,
	"actual_arrival_date" timestamp,
	"total_amount" numeric(12, 2) NOT NULL,
	"status" "shipment_status" DEFAULT 'pending' NOT NULL,
	"origin_port" text NOT NULL,
	"destination_port" text NOT NULL,
	"container_number" text,
	"flight_number" text,
	"notes" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"purchase_ids" uuid[],
	"vendor_ids" uuid[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shipments_shipment_ref_number_unique" UNIQUE("shipment_ref_number")
);
--> statement-breakpoint
ALTER TABLE "parcel_items" ADD CONSTRAINT "parcel_items_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_items" ADD CONSTRAINT "parcel_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_items" ADD CONSTRAINT "parcel_items_purchase_reference_purchases_id_fk" FOREIGN KEY ("purchase_reference") REFERENCES "public"."purchases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipping_vendor_id_vendors_id_fk" FOREIGN KEY ("shipping_vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parcel_items_active_idx" ON "parcel_items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "parcel_items_parcel_id_idx" ON "parcel_items" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "parcel_items_product_id_idx" ON "parcel_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "parcels_active_idx" ON "parcels" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "parcels_shipment_id_idx" ON "parcels" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "shippments_active_idx" ON "shipments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "shippments_purchase_ids_idx" ON "shipments" USING btree ("purchase_ids");--> statement-breakpoint
CREATE INDEX "shippments_vendor_ids_idx" ON "shipments" USING btree ("vendor_ids");