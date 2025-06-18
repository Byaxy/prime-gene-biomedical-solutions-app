ALTER TABLE "waybill_items" ADD COLUMN "sale_item_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "waybill_items" ADD CONSTRAINT "waybill_items_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waybill_item_inventory" DROP COLUMN "sub_total";