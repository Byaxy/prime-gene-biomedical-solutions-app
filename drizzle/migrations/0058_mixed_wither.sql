ALTER TABLE "parcel_items" DROP CONSTRAINT "parcel_items_purchase_reference_purchases_id_fk";
--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "origin_port" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "destination_port" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "parcel_items" DROP COLUMN "purchase_reference";