-- Clean-break redesign: flat Vault model -> App / ConfigFile / SecretFile (blob-only).
-- Test phase, no real users: existing vault data is intentionally discarded; users re-run depvault push.
TRUNCATE TABLE secret_files, ci_tokens CASCADE;

-- DropForeignKey
ALTER TABLE "ci_tokens" DROP CONSTRAINT "ci_tokens_vault_id_fkey";

-- DropForeignKey
ALTER TABLE "env_variable_versions" DROP CONSTRAINT "env_variable_versions_variable_id_fkey";

-- DropForeignKey
ALTER TABLE "env_variables" DROP CONSTRAINT "env_variables_vault_id_fkey";

-- DropForeignKey
ALTER TABLE "secret_files" DROP CONSTRAINT "secret_files_vault_id_fkey";

-- DropForeignKey
ALTER TABLE "vaults" DROP CONSTRAINT "vaults_project_id_fkey";

-- DropIndex
DROP INDEX "secret_files_vault_id_name_key";

-- AlterTable
ALTER TABLE "ci_tokens" DROP COLUMN "vault_id",
ADD COLUMN     "app_id" UUID NOT NULL,
ADD COLUMN     "environment_slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "secret_file_versions" ADD COLUMN     "is_binary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "message" TEXT;

-- AlterTable
ALTER TABLE "secret_files" DROP COLUMN "name",
DROP COLUMN "vault_id",
ADD COLUMN     "app_id" UUID NOT NULL,
ADD COLUMN     "environment_slug" TEXT,
ADD COLUMN     "is_binary" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "relative_path" TEXT NOT NULL;

-- DropTable
DROP TABLE "env_variable_versions";

-- DropTable
DROP TABLE "env_variables";

-- DropTable
DROP TABLE "vaults";

-- CreateTable
CREATE TABLE "apps" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "app_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_files" (
    "id" UUID NOT NULL,
    "app_id" UUID NOT NULL,
    "relative_path" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "environment_slug" TEXT NOT NULL,
    "encrypted_content" BYTEA NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "is_binary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "config_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_file_versions" (
    "id" UUID NOT NULL,
    "config_file_id" UUID NOT NULL,
    "encrypted_content" BYTEA NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "is_binary" BOOLEAN NOT NULL DEFAULT false,
    "changed_by" UUID NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "apps_project_id_app_path_key" ON "apps"("project_id", "app_path");

-- CreateIndex
CREATE INDEX "config_files_app_id_environment_slug_idx" ON "config_files"("app_id", "environment_slug");

-- CreateIndex
CREATE UNIQUE INDEX "config_files_app_id_relative_path_key" ON "config_files"("app_id", "relative_path");

-- CreateIndex
CREATE INDEX "config_file_versions_config_file_id_idx" ON "config_file_versions"("config_file_id");

-- CreateIndex
CREATE INDEX "ci_tokens_app_id_environment_slug_idx" ON "ci_tokens"("app_id", "environment_slug");

-- CreateIndex
CREATE INDEX "secret_file_versions_secret_file_id_idx" ON "secret_file_versions"("secret_file_id");

-- CreateIndex
CREATE INDEX "secret_files_app_id_environment_slug_idx" ON "secret_files"("app_id", "environment_slug");

-- CreateIndex
CREATE UNIQUE INDEX "secret_files_app_id_relative_path_key" ON "secret_files"("app_id", "relative_path");

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_files" ADD CONSTRAINT "config_files_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_file_versions" ADD CONSTRAINT "config_file_versions_config_file_id_fkey" FOREIGN KEY ("config_file_id") REFERENCES "config_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_tokens" ADD CONSTRAINT "ci_tokens_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_files" ADD CONSTRAINT "secret_files_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

