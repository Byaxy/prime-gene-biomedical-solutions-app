CREATE TYPE "public"."commission_payment_status" AS ENUM('pending', 'paid', 'partial', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('pending_approval', 'approved', 'processed', 'cancelled');--> statement-breakpoint
CREATE TABLE "commission_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_id" uuid NOT NULL,
	"sales_agent_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_status" "commission_payment_status" DEFAULT 'pending' NOT NULL,
	"paid_date" timestamp,
	"paying_account_id" uuid NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_ref_number" text NOT NULL,
	"commission_date" timestamp NOT NULL,
	"sale_id" uuid NOT NULL,
	"notes" text,
	"amount_received" numeric(12, 2) NOT NULL,
	"additions" numeric(12, 2) DEFAULT 0 NOT NULL,
	"deductions" numeric(12, 2) DEFAULT 0 NOT NULL,
	"commission_rate" numeric(12, 2) NOT NULL,
	"withholding_tax_rate" numeric(12, 2) NOT NULL,
	"withholding_tax_id" uuid,
	"base_for_commission" numeric(12, 2) NOT NULL,
	"gross_commission" numeric(12, 2) NOT NULL,
	"withholding_tax_amount" numeric(12, 2) NOT NULL,
	"total_commission_payable" numeric(12, 2) NOT NULL,
	"status" "commission_status" DEFAULT 'pending_approval' NOT NULL,
	"payment_status" "commission_payment_status" DEFAULT 'pending' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commissions_commission_ref_number_unique" UNIQUE("commission_ref_number")
);
--> statement-breakpoint
CREATE TABLE "sales_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"agent_code" text,
	"user_id" uuid,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_agents_agent_code_unique" UNIQUE("agent_code")
);
--> statement-breakpoint
ALTER TABLE "commission_recipients" ADD CONSTRAINT "commission_recipients_commission_id_commissions_id_fk" FOREIGN KEY ("commission_id") REFERENCES "public"."commissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_recipients" ADD CONSTRAINT "commission_recipients_sales_agent_id_sales_agents_id_fk" FOREIGN KEY ("sales_agent_id") REFERENCES "public"."sales_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_recipients" ADD CONSTRAINT "commission_recipients_paying_account_id_accounts_id_fk" FOREIGN KEY ("paying_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_withholding_tax_id_tax_rates_id_fk" FOREIGN KEY ("withholding_tax_id") REFERENCES "public"."tax_rates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_agents" ADD CONSTRAINT "sales_agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;