-- Step 1: Add vault_group_id column (nullable first)
ALTER TABLE "secret_files" ADD COLUMN "vault_group_id" UUID;

-- Step 2: Populate vault_group_id from the environment relation
UPDATE "secret_files" sf
SET "vault_group_id" = e."vault_group_id"
FROM "environments" e
WHERE sf."environment_id" = e."id";

-- Step 3: Make vault_group_id non-nullable
ALTER TABLE "secret_files" ALTER COLUMN "vault_group_id" SET NOT NULL;

-- Step 4: Drop old unique constraint and environment FK
ALTER TABLE "secret_files" DROP CONSTRAINT IF EXISTS "secret_files_environment_id_name_key";
ALTER TABLE "secret_files" DROP CONSTRAINT IF EXISTS "secret_files_environment_id_fkey";

-- Step 5: Drop environment_id column
ALTER TABLE "secret_files" DROP COLUMN "environment_id";

-- Step 6: Add new FK and unique constraint
ALTER TABLE "secret_files" ADD CONSTRAINT "secret_files_vault_group_id_fkey"
  FOREIGN KEY ("vault_group_id") REFERENCES "vault_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "secret_files" ADD CONSTRAINT "secret_files_vault_group_id_name_key"
  UNIQUE ("vault_group_id", "name");
