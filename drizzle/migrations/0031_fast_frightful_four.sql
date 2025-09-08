ALTER TABLE "customers" ALTER COLUMN "address" SET DATA TYPE jsonb USING 
  COALESCE(
    NULLIF(address, '')::jsonb,
    '{"addressName":"","address":"","city":"","state":"","country":""}'::jsonb
  );--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "address" SET DEFAULT '{"addressName":"","address":"","city":"","state":"","country":""}'::jsonb;