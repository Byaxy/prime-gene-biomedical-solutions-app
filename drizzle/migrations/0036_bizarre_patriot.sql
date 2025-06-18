ALTER TYPE "public"."transaction_type" ADD VALUE 'waybill_edit_reversal' BEFORE 'transfer';--> statement-breakpoint
ALTER TYPE "public"."transaction_type" ADD VALUE 'waybill_edit' BEFORE 'transfer';