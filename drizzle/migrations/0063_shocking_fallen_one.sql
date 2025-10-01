ALTER TABLE "vendors" ALTER COLUMN "address" SET DATA TYPE jsonb USING
  CASE
    WHEN address IS NOT NULL AND address != ''
      THEN jsonb_build_object(
        'addressName', '',
        'address', address,
        'city', '',
        'state', '',
        'country', ''
      )
    ELSE '{"addressName":"","address":"","city":"","state":"","country":""}'::jsonb
  END;
--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "address" SET DEFAULT '{"addressName":"","address":"","city":"","state":"","country":""}'::jsonb;