/*
  Warnings:

  - Made the column `wrapped_recovery_key` on table `user_vaults` required. This step will fail if there are existing NULL values in that column.
  - Made the column `wrapped_recovery_key_iv` on table `user_vaults` required. This step will fail if there are existing NULL values in that column.
  - Made the column `wrapped_recovery_key_tag` on table `user_vaults` required. This step will fail if there are existing NULL values in that column.

*/
-- Delete vaults without recovery keys (pre-E2E migration vaults)
DELETE FROM "project_key_grants" WHERE "user_id" IN (
  SELECT "user_id" FROM "user_vaults" WHERE "wrapped_recovery_key" IS NULL
);
DELETE FROM "user_vaults" WHERE "wrapped_recovery_key" IS NULL;

-- AlterTable
ALTER TABLE "user_vaults" ALTER COLUMN "wrapped_recovery_key" SET NOT NULL,
ALTER COLUMN "wrapped_recovery_key_iv" SET NOT NULL,
ALTER COLUMN "wrapped_recovery_key_tag" SET NOT NULL;
