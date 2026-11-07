-- Better Auth 1.7 uses the linked user's ID to select a password credential.
UPDATE "account" AS legacy
SET "account_id" = legacy."user_id"
WHERE legacy."provider_id" = 'credential'
  AND legacy."account_id" <> legacy."user_id"
  AND legacy."password" IS NOT NULL
  AND legacy."access_token" IS NULL
  AND legacy."refresh_token" IS NULL
  AND legacy."id_token" IS NULL
  AND EXISTS (
    SELECT 1 FROM "user"
    WHERE "user"."id" = legacy."user_id"
      AND "user"."email" = legacy."account_id"
  )
  AND NOT EXISTS (
    SELECT 1 FROM "account" AS other
    WHERE other."provider_id" = 'credential'
      AND other."id" <> legacy."id"
      AND (other."user_id" = legacy."user_id" OR other."account_id" = legacy."user_id")
  );
