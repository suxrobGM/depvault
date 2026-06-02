-- Merge ConfigFile + SecretFile into a single RepoFile model (blob-only, kind-discriminated),
-- rename SharedSecret -> ShareLink, and collapse the audit resource enum to REPO_FILE.
-- Test phase, no real users: existing config/secret file rows are intentionally discarded;
-- users re-run `depvault push`.

-- 1. Drop the old file tables (CASCADE drops their FKs + versions).
DROP TABLE IF EXISTS "config_file_versions", "config_files", "secret_file_versions", "secret_files" CASCADE;

-- 2. Unified RepoFile model.
CREATE TYPE "RepoFileKind" AS ENUM ('CONFIG', 'SECRET');

CREATE TABLE "repo_files" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "app_id" UUID NOT NULL,
    "kind" "RepoFileKind" NOT NULL,
    "relative_path" TEXT NOT NULL,
    "environment_slug" TEXT,
    "format" TEXT,
    "mime_type" TEXT,
    "description" TEXT,
    "encrypted_content" BYTEA NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "is_binary" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repo_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repo_file_versions" (
    "id" UUID NOT NULL,
    "repo_file_id" UUID NOT NULL,
    "encrypted_content" BYTEA NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "is_binary" BOOLEAN NOT NULL DEFAULT false,
    "changed_by" UUID NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repo_file_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "repo_files_project_id_relative_path_key" ON "repo_files"("project_id", "relative_path");
CREATE INDEX "repo_files_app_id_idx" ON "repo_files"("app_id");
CREATE INDEX "repo_files_app_id_kind_idx" ON "repo_files"("app_id", "kind");
CREATE INDEX "repo_files_project_id_environment_slug_idx" ON "repo_files"("project_id", "environment_slug");
CREATE INDEX "repo_file_versions_repo_file_id_idx" ON "repo_file_versions"("repo_file_id");

ALTER TABLE "repo_files" ADD CONSTRAINT "repo_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repo_files" ADD CONSTRAINT "repo_files_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repo_files" ADD CONSTRAINT "repo_files_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "repo_file_versions" ADD CONSTRAINT "repo_file_versions_repo_file_id_fkey" FOREIGN KEY ("repo_file_id") REFERENCES "repo_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Collapse AuditResourceType to REPO_FILE (remap historical CONFIG_FILE/SECRET_FILE rows).
ALTER TYPE "AuditResourceType" RENAME TO "AuditResourceType_old";
CREATE TYPE "AuditResourceType" AS ENUM ('REPO_FILE', 'SHARE_LINK', 'CI_TOKEN');
ALTER TABLE "audit_logs"
    ALTER COLUMN "resource_type" TYPE "AuditResourceType"
    USING (
      CASE "resource_type"::text
        WHEN 'CONFIG_FILE' THEN 'REPO_FILE'
        WHEN 'SECRET_FILE' THEN 'REPO_FILE'
        ELSE "resource_type"::text
      END::"AuditResourceType"
    );
DROP TYPE "AuditResourceType_old";

-- 4. Rename SharedSecret -> ShareLink (data preserved).
ALTER TYPE "SharedSecretStatus" RENAME TO "ShareLinkStatus";
ALTER TABLE "shared_secrets" RENAME TO "share_links";
ALTER INDEX "shared_secrets_pkey" RENAME TO "share_links_pkey";
ALTER INDEX "shared_secrets_token_key" RENAME TO "share_links_token_key";
ALTER TABLE "share_links" RENAME CONSTRAINT "shared_secrets_creator_id_fkey" TO "share_links_creator_id_fkey";
ALTER TABLE "share_links" RENAME CONSTRAINT "shared_secrets_project_id_fkey" TO "share_links_project_id_fkey";
