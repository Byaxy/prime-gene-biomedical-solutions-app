CREATE TYPE "public"."journal_entry_reference_type" AS ENUM('purchase', 'sale', 'expense', 'payment_received', 'bill_payment', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('bank', 'mobile_money', 'cash_on_hand', 'other');--> statement-breakpoint
CREATE TYPE "public"."chart_of_account_type" AS ENUM('asset', 'liability', 'equity', 'revenue', 'expense', 'cogs', 'other');--> statement-breakpoint
CREATE TABLE "accompanying_expense_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"default_expense_category_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accompanying_expense_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"account_type" "account_type" NOT NULL,
	"account_number" text NOT NULL,
	"bank_name" text NOT NULL,
	"bank_address" jsonb DEFAULT '{"addressName":"","address":"","city":"","state":"","country":""}'::jsonb,
	"swift_code" text,
	"merchant_code" text,
	"opening_balance" numeric(12, 2) NOT NULL,
	"current_balance" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL,
	"chart_of_accounts_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "bill_payment_accompanying_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_payment_id" uuid NOT NULL,
	"accompanying_expense_type_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payee" text DEFAULT '',
	"comments" text DEFAULT '',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bill_payment_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_payment_id" uuid NOT NULL,
	"paying_account_id" uuid NOT NULL,
	"amount_paid_from_account" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bill_payment_accounts_bill_payment_id_paying_account_id_unique" UNIQUE("bill_payment_id","paying_account_id")
);
--> statement-breakpoint
CREATE TABLE "bill_payment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_payment_id" uuid NOT NULL,
	"purchase_id" uuid NOT NULL,
	"amount_applied" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bill_payment_items_bill_payment_id_purchase_id_unique" UNIQUE("bill_payment_id","purchase_id")
);
--> statement-breakpoint
CREATE TABLE "bill_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_reference_no" text NOT NULL,
	"payment_date" timestamp NOT NULL,
	"vendor_id" uuid NOT NULL,
	"total_payment_amount" numeric(12, 2) NOT NULL,
	"general_comments" text DEFAULT '',
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bill_payments_bill_reference_no_unique" UNIQUE("bill_reference_no")
);
--> statement-breakpoint
CREATE TABLE "chart_of_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"account_type" chart_of_account_type NOT NULL,
	"description" text DEFAULT '',
	"parent_id" uuid,
	"path" text,
	"depth" integer DEFAULT 0,
	"is_control_account" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chart_of_accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"parent_id" uuid,
	"path" text,
	"depth" integer DEFAULT 0,
	"chart_of_accounts_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '',
	"parent_id" uuid,
	"path" text,
	"depth" integer DEFAULT 0,
	"chart_of_accounts_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_date" timestamp NOT NULL,
	"reference_type" "journal_entry_reference_type" NOT NULL,
	"reference_id" uuid,
	"description" text DEFAULT '',
	"total_debit" numeric(12, 2) NOT NULL,
	"total_credit" numeric(12, 2) NOT NULL,
	"user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entry_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journal_entry_id" uuid,
	"chart_of_accounts_id" uuid,
	"description" text DEFAULT '',
	"debit" numeric(12, 2) NOT NULL,
	"credit" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments_received" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_ref_number" text NOT NULL,
	"payment_date" timestamp NOT NULL,
	"customer_id" uuid,
	"sale_id" uuid,
	"income_category_id" uuid,
	"receiving_account_id" uuid NOT NULL,
	"amount_received" numeric(12, 2) NOT NULL,
	"payment_method" "payment_method" DEFAULT 'cash' NOT NULL,
	"notes" text DEFAULT '',
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_received_payment_ref_number_unique" UNIQUE("payment_ref_number")
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "expense_category_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "paying_account_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "reference_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "payee" text NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "purchase_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "is_accompanying_expense" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "accompanying_expense_types" ADD CONSTRAINT "accompanying_expense_types_default_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("default_expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_chart_of_accounts_id_chart_of_accounts_id_fk" FOREIGN KEY ("chart_of_accounts_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_payment_accompanying_expenses" ADD CONSTRAINT "bill_payment_accompanying_expenses_bill_payment_id_bill_payments_id_fk" FOREIGN KEY ("bill_payment_id") REFERENCES "public"."bill_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_payment_accompanying_expenses" ADD CONSTRAINT "bill_payment_accompanying_expenses_accompanying_expense_type_id_accompanying_expense_types_id_fk" FOREIGN KEY ("accompanying_expense_type_id") REFERENCES "public"."accompanying_expense_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_payment_accounts" ADD CONSTRAINT "bill_payment_accounts_bill_payment_id_bill_payments_id_fk" FOREIGN KEY ("bill_payment_id") REFERENCES "public"."bill_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_payment_accounts" ADD CONSTRAINT "bill_payment_accounts_paying_account_id_accounts_id_fk" FOREIGN KEY ("paying_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_payment_items" ADD CONSTRAINT "bill_payment_items_bill_payment_id_bill_payments_id_fk" FOREIGN KEY ("bill_payment_id") REFERENCES "public"."bill_payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_payment_items" ADD CONSTRAINT "bill_payment_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_payments" ADD CONSTRAINT "bill_payments_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_payments" ADD CONSTRAINT "bill_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_chart_of_accounts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_parent_id_expense_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_chart_of_accounts_id_chart_of_accounts_id_fk" FOREIGN KEY ("chart_of_accounts_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_categories" ADD CONSTRAINT "income_categories_parent_id_income_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."income_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_categories" ADD CONSTRAINT "income_categories_chart_of_accounts_id_chart_of_accounts_id_fk" FOREIGN KEY ("chart_of_accounts_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_chart_of_accounts_id_chart_of_accounts_id_fk" FOREIGN KEY ("chart_of_accounts_id") REFERENCES "public"."chart_of_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_received" ADD CONSTRAINT "payments_received_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_received" ADD CONSTRAINT "payments_received_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_received" ADD CONSTRAINT "payments_received_income_category_id_income_categories_id_fk" FOREIGN KEY ("income_category_id") REFERENCES "public"."income_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_received" ADD CONSTRAINT "payments_received_receiving_account_id_accounts_id_fk" FOREIGN KEY ("receiving_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accompanying_expense_types_active_idx" ON "accompanying_expense_types" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "accompanying_expense_types_name_idx" ON "accompanying_expense_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX "accounts_active_idx" ON "accounts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "accounts_id_idx" ON "accounts" USING btree ("id");--> statement-breakpoint
CREATE INDEX "bill_payment_accompanying_expenses_active_idx" ON "bill_payment_accompanying_expenses" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "bill_payment_accompanying_expenses_bill_payment_id_idx" ON "bill_payment_accompanying_expenses" USING btree ("bill_payment_id");--> statement-breakpoint
CREATE INDEX "bill_payment_accompanying_expenses_accompanying_expense_type_id_idx" ON "bill_payment_accompanying_expenses" USING btree ("accompanying_expense_type_id");--> statement-breakpoint
CREATE INDEX "bill_payment_accounts_active_idx" ON "bill_payment_accounts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "bill_payment_accounts_bill_payment_id_idx" ON "bill_payment_accounts" USING btree ("bill_payment_id");--> statement-breakpoint
CREATE INDEX "bill_payment_accounts_paying_account_id_idx" ON "bill_payment_accounts" USING btree ("paying_account_id");--> statement-breakpoint
CREATE INDEX "bill_payment_items_active_idx" ON "bill_payment_items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "bill_payment_items_bill_payment_id_idx" ON "bill_payment_items" USING btree ("bill_payment_id");--> statement-breakpoint
CREATE INDEX "bill_payment_items_purchase_id_idx" ON "bill_payment_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "bill_payments_active_idx" ON "bill_payments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "bill_payments_ref_no_idx" ON "bill_payments" USING btree ("bill_reference_no");--> statement-breakpoint
CREATE INDEX "bill_payments_vendor_id_idx" ON "bill_payments" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "chart_of_accounts_active_idx" ON "chart_of_accounts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "chart_of_accounts_id_idx" ON "chart_of_accounts" USING btree ("id");--> statement-breakpoint
CREATE INDEX "expense_categories_active_idx" ON "expense_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "expense_categories_id_idx" ON "expense_categories" USING btree ("id");--> statement-breakpoint
CREATE INDEX "income_categories_active_idx" ON "income_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "income_categories_id_idx" ON "income_categories" USING btree ("id");--> statement-breakpoint
CREATE INDEX "journal_entries_id_idx" ON "journal_entries" USING btree ("id");--> statement-breakpoint
CREATE INDEX "journal_entry_lines_id_idx" ON "journal_entry_lines" USING btree ("id");--> statement-breakpoint
CREATE INDEX "journal_entry_lines_active_idx" ON "journal_entry_lines" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "payments_received_active_idx" ON "payments_received" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "payments_received_ref_number_idx" ON "payments_received" USING btree ("payment_ref_number");--> statement-breakpoint
CREATE INDEX "payments_received_customer_id_idx" ON "payments_received" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payments_received_sale_id_idx" ON "payments_received" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "payments_received_income_category_id_idx" ON "payments_received" USING btree ("income_category_id");--> statement-breakpoint
CREATE INDEX "payments_received_receiving_account_id_idx" ON "payments_received" USING btree ("receiving_account_id");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paying_account_id_accounts_id_fk" FOREIGN KEY ("paying_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_purchase_id_accompanying_expense_types_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."accompanying_expense_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "payment_method";--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_reference_number_unique" UNIQUE("reference_number");