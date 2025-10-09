ALTER TABLE "public"."chart_of_accounts" ALTER COLUMN "account_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."chart_of_account_type";--> statement-breakpoint
CREATE TYPE "public"."chart_of_account_type" AS ENUM('asset', 'liability', 'equity', 'revenue', 'expense', 'other');--> statement-breakpoint
ALTER TABLE "public"."chart_of_accounts" ALTER COLUMN "account_type" SET DATA TYPE "public"."chart_of_account_type" USING "account_type"::"public"."chart_of_account_type";