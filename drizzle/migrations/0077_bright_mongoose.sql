ALTER TABLE "commission_recipients" DROP CONSTRAINT "commission_recipients_paying_account_id_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "commission_recipients" ALTER COLUMN "paying_account_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_recipients" ADD CONSTRAINT "commission_recipients_paying_account_id_accounts_id_fk" FOREIGN KEY ("paying_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;