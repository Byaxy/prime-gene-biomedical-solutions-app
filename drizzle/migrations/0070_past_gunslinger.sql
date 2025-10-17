CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_name" text,
	"action_type" text NOT NULL,
	"table_name" text NOT NULL,
	"record_id" uuid NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" text,
	"user_agent" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expense_id" uuid NOT NULL,
	"title" text NOT NULL,
	"item_amount" numeric(12, 2) NOT NULL,
	"expense_category_id" uuid NOT NULL,
	"payee" text NOT NULL,
	"notes" text,
	"is_accompanying_expense" boolean DEFAULT false NOT NULL,
	"purchase_id" uuid,
	"accompanying_expense_type_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_expense_category_id_expense_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_purchase_id_purchases_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_accompanying_expense_type_id_accompanying_expense_types_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_accompanying_expense_type_id_accompanying_expense_types_id_fk" FOREIGN KEY ("accompanying_expense_type_id") REFERENCES "public"."accompanying_expense_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_table_name_idx" ON "audit_logs" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "audit_logs_record_id_idx" ON "audit_logs" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_type_idx" ON "audit_logs" USING btree ("action_type");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "expense_items_expense_id_idx" ON "expense_items" USING btree ("expense_id");--> statement-breakpoint
CREATE INDEX "expense_items_category_id_idx" ON "expense_items" USING btree ("expense_category_id");--> statement-breakpoint
CREATE INDEX "expense_items_purchase_id_idx" ON "expense_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "expenses_paying_account_id_idx" ON "expenses" USING btree ("paying_account_id");--> statement-breakpoint
CREATE INDEX "expenses_expense_date_idx" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "expense_category_id";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "payee";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "purchase_id";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "is_accompanying_expense";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "accompanying_expense_type_id";