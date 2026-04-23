-- Preludes:
-- 1. Remove rows incompatible with the new enum definitions (cast via ::text would fail).
-- 2. Clear tables whose FK columns (environment_id / vault_group_id) are being dropped and
--    replaced with NOT NULL vault_id columns for which we have no valid target yet.
-- User accounts and projects are preserved; vault/env/secret/ci-token data is disposable at this stage.
DELETE FROM "notifications" WHERE "type" = 'ENV_DRIFT';
DELETE FROM "audit_logs" WHERE "resource_type" = 'ENV_TEMPLATE';
TRUNCATE TABLE "env_variable_versions", "env_variables", "ci_tokens", "secret_files" CASCADE;

-- AlterEnum
BEGIN;
CREATE TYPE "AuditResourceType_new" AS ENUM ('ENV_VARIABLE', 'SECRET_FILE', 'SHARE_LINK', 'CI_TOKEN');
ALTER TABLE "audit_logs" ALTER COLUMN "resource_type" TYPE "AuditResourceType_new" USING ("resource_type"::text::"AuditResourceType_new");
ALTER TYPE "AuditResourceType" RENAME TO "AuditResourceType_old";
ALTER TYPE "AuditResourceType_new" RENAME TO "AuditResourceType";
DROP TYPE "public"."AuditResourceType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('VULNERABILITY_FOUND', 'SECRET_ROTATION', 'TEAM_INVITE', 'ROLE_CHANGE', 'GIT_SECRET_DETECTION', 'INVITATION_RECEIVED', 'MEMBER_REMOVED');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "ci_tokens" DROP CONSTRAINT "ci_tokens_environment_id_fkey";

-- DropForeignKey
ALTER TABLE "env_template_variables" DROP CONSTRAINT "env_template_variables_template_id_fkey";

-- DropForeignKey
ALTER TABLE "env_templates" DROP CONSTRAINT "env_templates_created_by_fkey";

-- DropForeignKey
ALTER TABLE "env_templates" DROP CONSTRAINT "env_templates_project_id_fkey";

-- DropForeignKey
ALTER TABLE "env_variables" DROP CONSTRAINT "env_variables_environment_id_fkey";

-- DropForeignKey
ALTER TABLE "environments" DROP CONSTRAINT "environments_project_id_fkey";

-- DropForeignKey
ALTER TABLE "environments" DROP CONSTRAINT "environments_vault_group_id_fkey";

-- DropForeignKey
ALTER TABLE "secret_files" DROP CONSTRAINT "secret_files_vault_group_id_fkey";

-- DropForeignKey
ALTER TABLE "vault_groups" DROP CONSTRAINT "vault_groups_project_id_fkey";

-- DropIndex
DROP INDEX "env_variables_environment_id_key_key";

-- DropIndex
DROP INDEX "secret_files_vault_group_id_name_key";

-- AlterTable
ALTER TABLE "ci_tokens" DROP COLUMN "environment_id",
ADD COLUMN     "vault_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "env_variables" DROP COLUMN "environment_id",
ADD COLUMN     "vault_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "secret_files" DROP COLUMN "vault_group_id",
ADD COLUMN     "vault_id" UUID NOT NULL;

-- DropTable
DROP TABLE "env_template_variables";

-- DropTable
DROP TABLE "env_templates";

-- DropTable
DROP TABLE "environments";

-- DropTable
DROP TABLE "vault_groups";

-- DropEnum
DROP TYPE "EnvironmentType";

-- CreateTable
CREATE TABLE "vaults" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "directory_path" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vaults_tags_idx" ON "vaults" USING GIN ("tags");

-- CreateIndex
CREATE UNIQUE INDEX "vaults_project_id_name_key" ON "vaults"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "env_variables_vault_id_key_key" ON "env_variables"("vault_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "secret_files_vault_id_name_key" ON "secret_files"("vault_id", "name");

-- AddForeignKey
ALTER TABLE "ci_tokens" ADD CONSTRAINT "ci_tokens_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "vaults"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "env_variables" ADD CONSTRAINT "env_variables_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "vaults"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_files" ADD CONSTRAINT "secret_files_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "vaults"("id") ON DELETE CASCADE ON UPDATE CASCADE;
