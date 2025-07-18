ALTER TABLE "promissory_notes" DROP CONSTRAINT "promissory_notes_sales_id_sales_id_fk";
--> statement-breakpoint
ALTER TABLE "promissory_notes" DROP CONSTRAINT "promissory_notes_waybill_id_waybills_id_fk";
--> statement-breakpoint
ALTER TABLE "promissory_note_items" ADD COLUMN "sale_item_id" uuid;--> statement-breakpoint
ALTER TABLE "promissory_note_items" ADD COLUMN "fulfilled_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "promissory_note_items" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "promissory_note_items" ADD COLUMN "product_ID" text;--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD COLUMN "sale_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "promissory_note_items" ADD CONSTRAINT "promissory_note_items_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promissory_notes" ADD CONSTRAINT "promissory_notes_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promissory_notes" DROP COLUMN "sales_id";--> statement-breakpoint
ALTER TABLE "promissory_notes" DROP COLUMN "waybill_id";--> statement-breakpoint
ALTER TABLE "public"."promissory_notes" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."promissory_note_status";--> statement-breakpoint
CREATE TYPE "public"."promissory_note_status" AS ENUM('pending', 'fulfilled', 'partial', 'cancelled');--> statement-breakpoint
ALTER TABLE "public"."promissory_notes" ALTER COLUMN "status" SET DATA TYPE "public"."promissory_note_status" USING "status"::"public"."promissory_note_status";