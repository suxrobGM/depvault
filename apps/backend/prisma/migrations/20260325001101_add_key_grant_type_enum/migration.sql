/*
  Warnings:

  - The `grant_type` column on the `project_key_grants` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "KeyGrantType" AS ENUM ('SELF', 'ECDH', 'RECOVERY');

-- AlterTable
ALTER TABLE "project_key_grants" DROP COLUMN "grant_type",
ADD COLUMN     "grant_type" "KeyGrantType" NOT NULL DEFAULT 'ECDH';

-- CreateIndex
CREATE UNIQUE INDEX "project_key_grants_project_id_user_id_grant_type_key" ON "project_key_grants"("project_id", "user_id", "grant_type");
