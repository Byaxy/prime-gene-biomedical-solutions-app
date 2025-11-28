CREATE TABLE "commission_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_ref_number" text NOT NULL,
	"commission_recipient_id" uuid NOT NULL,
	"paying_account_id" uuid NOT NULL,
	"expense_category_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payout_date" timestamp NOT NULL,
	"notes" text,
	"user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commission_payouts_payout_ref_number_unique" UNIQUE("payout_ref_number")
);
--> statement-breakpoint
ALTER TABLE "commission_recipients" DROP CONSTRAINT "commission_recipients_paying_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_commission_recipient_id_commission_recipients_id_fk" FOREIGN KEY ("commission_recipient_id") REFERENCES "public"."commission_recipients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_paying_account_id_accounts_id_fk" FOREIGN KEY ("paying_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_expense_category_id_expense_categories_id_fk" FOREIGN KEY ("expense_category_id") REFERENCES "public"."expense_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_payouts" ADD CONSTRAINT "commission_payouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payouts_commission_recipient_id_idx" ON "commission_payouts" USING btree ("commission_recipient_id");--> statement-breakpoint
CREATE INDEX "payouts_paying_account_id_idx" ON "commission_payouts" USING btree ("paying_account_id");--> statement-breakpoint
CREATE INDEX "payouts_expense_category_id_idx" ON "commission_payouts" USING btree ("expense_category_id");--> statement-breakpoint
CREATE INDEX "payouts_user_id_idx" ON "commission_payouts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payouts_payout_date_idx" ON "commission_payouts" USING btree ("payout_date");--> statement-breakpoint
ALTER TABLE "commission_recipients" DROP COLUMN "paid_date";--> statement-breakpoint
ALTER TABLE "commission_recipients" DROP COLUMN "paying_account_id";