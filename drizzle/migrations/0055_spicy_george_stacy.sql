ALTER TABLE "deliveries" DROP CONSTRAINT "deliveries_customer_id_customers_id_fk";
--> statement-breakpoint
ALTER TABLE "deliveries" DROP CONSTRAINT "deliveries_sale_id_sales_id_fk";
--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;