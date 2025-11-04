CREATE TABLE "receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"payment_received_id" uuid NOT NULL,
	"invoice_number" text,
	"invoice_date" timestamp,
	"amunt_due" numeric(12, 2) NOT NULL,
	"amount_received" numeric(12, 2) NOT NULL,
	"balance_due" numeric(12, 2),
	"payment_method" "payment_method" NOT NULL,
	"sale_id" uuid,
	"income_category_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_number" text NOT NULL,
	"receipt_date" timestamp NOT NULL,
	"customer_id" uuid,
	"total_amount_received" numeric(12, 2) NOT NULL,
	"total_amount_due" numeric(12, 2) NOT NULL,
	"total_balance_due" numeric(12, 2) NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_receipt_number_unique" UNIQUE("receipt_number")
);
--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "received_date" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_receipts_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_payment_received_id_payments_received_id_fk" FOREIGN KEY ("payment_received_id") REFERENCES "public"."payments_received"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_income_category_id_income_categories_id_fk" FOREIGN KEY ("income_category_id") REFERENCES "public"."income_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipt_items_receipt_id_idx" ON "receipt_items" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "receipt_items_sale_id_idx" ON "receipt_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "receipt_items_active_idx" ON "receipt_items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "receipts_active_idx" ON "receipts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "receipts_number_idx" ON "receipts" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "receipts_customer_id_idx" ON "receipts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "receipts_receipt_date_idx" ON "receipts" USING btree ("receipt_date");--> statement-breakpoint
CREATE INDEX "receipts_created_at_idx" ON "receipts" USING btree ("created_at");