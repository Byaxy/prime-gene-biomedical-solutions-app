ALTER TABLE "expenses" DROP CONSTRAINT "expenses_paying_account_id_accounts_id_fk";
--> statement-breakpoint
DROP INDEX "expenses_paying_account_id_idx";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "paying_account_id";