ALTER TABLE "chart_of_accounts" DROP CONSTRAINT "chart_of_accounts_account_number_unique";--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "account_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "bank_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chart_of_accounts" DROP COLUMN "account_number";