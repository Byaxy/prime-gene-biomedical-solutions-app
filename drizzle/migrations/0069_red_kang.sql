ALTER TABLE "expenses" DROP CONSTRAINT "expenses_purchase_id_accompanying_expense_types_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "accompanying_expense_type_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_accompanying_expense_type_id_accompanying_expense_types_id_fk" FOREIGN KEY ("accompanying_expense_type_id") REFERENCES "public"."accompanying_expense_types"("id") ON DELETE set null ON UPDATE no action;