ALTER TABLE "expense_categories" DROP CONSTRAINT "expense_categories_parent_id_expense_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "income_categories" DROP CONSTRAINT "income_categories_parent_id_income_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "expense_categories" DROP COLUMN "parent_id";--> statement-breakpoint
ALTER TABLE "expense_categories" DROP COLUMN "path";--> statement-breakpoint
ALTER TABLE "expense_categories" DROP COLUMN "depth";--> statement-breakpoint
ALTER TABLE "income_categories" DROP COLUMN "parent_id";--> statement-breakpoint
ALTER TABLE "income_categories" DROP COLUMN "path";--> statement-breakpoint
ALTER TABLE "income_categories" DROP COLUMN "depth";