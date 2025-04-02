ALTER TABLE "products" ADD COLUMN "product_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_id_unique" UNIQUE("product_id");