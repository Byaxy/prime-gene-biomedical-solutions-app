ALTER TABLE "waybills" ALTER COLUMN "conversion_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "waybills" ALTER COLUMN "conversion_status" DROP NOT NULL;