ALTER TABLE "quotations" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "quotations" DROP COLUMN "image_id";--> statement-breakpoint
ALTER TABLE "quotations" DROP COLUMN "image_url";