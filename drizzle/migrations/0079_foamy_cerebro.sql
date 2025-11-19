CREATE TABLE "commission_recipient_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_recipient_id" uuid NOT NULL,
	"commission_sales_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commission_recipient_sales_commission_recipient_id_commission_sales_id_unique" UNIQUE("commission_recipient_id","commission_sales_id")
);
--> statement-breakpoint
CREATE TABLE "commission_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"amount_received" numeric(12, 2) NOT NULL,
	"additions" numeric(12, 2) DEFAULT 0 NOT NULL,
	"deductions" numeric(12, 2) DEFAULT 0 NOT NULL,
	"commission_rate" numeric(12, 2) NOT NULL,
	"withholding_tax_rate" numeric(12, 2) NOT NULL,
	"withholding_tax_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commission_sales_sale_id_unique" UNIQUE("sale_id")
);
--> statement-breakpoint
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_sale_id_sales_id_fk";
--> statement-breakpoint
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_withholding_tax_id_tax_rates_id_fk";
--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "customer_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "total_amount_received" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "total_additions" numeric(12, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "total_deductions" numeric(12, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "total_base_for_commission" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "total_gross_commission" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "total_withholding_tax_amount" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_recipient_sales" ADD CONSTRAINT "commission_recipient_sales_commission_recipient_id_commission_recipients_id_fk" FOREIGN KEY ("commission_recipient_id") REFERENCES "public"."commission_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_recipient_sales" ADD CONSTRAINT "commission_recipient_sales_commission_sales_id_commission_sales_id_fk" FOREIGN KEY ("commission_sales_id") REFERENCES "public"."commission_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_sales" ADD CONSTRAINT "commission_sales_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_sales" ADD CONSTRAINT "commission_sales_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_sales" ADD CONSTRAINT "commission_sales_withholding_tax_id_tax_rates_id_fk" FOREIGN KEY ("withholding_tax_id") REFERENCES "public"."tax_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commission_recipient_sales_recipient_id_idx" ON "commission_recipient_sales" USING btree ("commission_recipient_id");--> statement-breakpoint
CREATE INDEX "commission_recipient_sales_sales_id_idx" ON "commission_recipient_sales" USING btree ("commission_sales_id");--> statement-breakpoint
CREATE INDEX "commission_recipient_sales_active_idx" ON "commission_recipient_sales" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "commission_sales_commission_id_idx" ON "commission_sales" USING btree ("commission_id");--> statement-breakpoint
CREATE INDEX "commission_sales_sale_id_idx" ON "commission_sales" USING btree ("sale_id");--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commissions_active_idx" ON "commissions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "commissions_customer_id_idx" ON "commissions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "commissions_commission_date_idx" ON "commissions" USING btree ("commission_date");--> statement-breakpoint
CREATE INDEX "commissions_status_idx" ON "commissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "commissions_payment_status_idx" ON "commissions" USING btree ("payment_status");--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "sale_id";--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "amount_received";--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "additions";--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "deductions";--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "commission_rate";--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "withholding_tax_rate";--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "withholding_tax_id";--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "base_for_commission";--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "gross_commission";--> statement-breakpoint
ALTER TABLE "commissions" DROP COLUMN "withholding_tax_amount";