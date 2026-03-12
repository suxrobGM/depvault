-- CreateEnum
CREATE TYPE "Ecosystem" AS ENUM ('NODEJS', 'PYTHON', 'RUST', 'DOTNET', 'GO', 'JAVA', 'KOTLIN', 'RUBY', 'PHP');

-- CreateEnum
CREATE TYPE "DependencyStatus" AS ENUM ('UP_TO_DATE', 'PATCH_UPDATE', 'MINOR_UPDATE', 'MAJOR_UPDATE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "VulnerabilitySeverity" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "LicensePolicy" AS ENUM ('ALLOW', 'WARN', 'BLOCK');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'DOWNLOAD', 'SHARE', 'UPLOAD', 'CLONE');

-- CreateEnum
CREATE TYPE "AuditResourceType" AS ENUM ('ENV_VARIABLE', 'ENV_TEMPLATE', 'SECRET_FILE', 'SHARE_LINK', 'CI_TOKEN');

-- CreateEnum
CREATE TYPE "EnvironmentType" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION', 'GLOBAL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('VULNERABILITY_FOUND', 'SECRET_ROTATION', 'ENV_DRIFT', 'TEAM_INVITE', 'ROLE_CHANGE', 'GIT_SECRET_DETECTION');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "DetectionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DetectionStatus" AS ENUM ('OPEN', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SharedSecretStatus" AS ENUM ('PENDING', 'VIEWED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SharedSecretType" AS ENUM ('ENV_VARIABLES', 'SECRET_FILE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GITHUB');

-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT,
    "ecosystem" "Ecosystem" NOT NULL,
    "health_score" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependencies" (
    "id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "current_version" TEXT NOT NULL,
    "latest_version" TEXT,
    "status" "DependencyStatus" NOT NULL DEFAULT 'UP_TO_DATE',
    "license" TEXT,
    "license_policy" "LicensePolicy" NOT NULL DEFAULT 'ALLOW',
    "is_direct" BOOLEAN NOT NULL DEFAULT true,
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerabilities" (
    "id" UUID NOT NULL,
    "dependency_id" UUID NOT NULL,
    "cve_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "VulnerabilitySeverity" NOT NULL DEFAULT 'NONE',
    "fixed_in" TEXT,
    "url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vulnerabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "project_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resource_type" "AuditResourceType" NOT NULL,
    "resource_id" UUID NOT NULL,
    "ip_address" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ci_tokens" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "environment_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_prefix" TEXT NOT NULL,
    "ip_allowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ci_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_groups" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vault_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "vault_group_id" UUID NOT NULL,
    "type" "EnvironmentType" NOT NULL DEFAULT 'DEVELOPMENT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "env_variables" (
    "id" UUID NOT NULL,
    "environment_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "env_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "env_variable_versions" (
    "id" UUID NOT NULL,
    "variable_id" UUID NOT NULL,
    "encrypted_value" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "changed_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "env_variable_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "env_templates" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "env_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "env_template_variables" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "env_template_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "repository_url" TEXT,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_rules" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "license_id" TEXT NOT NULL,
    "policy" "LicensePolicy" NOT NULL DEFAULT 'WARN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_patterns" (
    "id" UUID NOT NULL,
    "project_id" UUID,
    "name" TEXT NOT NULL,
    "regex" TEXT NOT NULL,
    "severity" "DetectionSeverity" NOT NULL,
    "is_built_in" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secret_scans" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "triggered_by_id" UUID NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "commits_scanned" INTEGER NOT NULL DEFAULT 0,
    "detections_found" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secret_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secret_detections" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "scan_id" UUID NOT NULL,
    "scan_pattern_id" UUID NOT NULL,
    "commit_hash" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "line_number" INTEGER,
    "match_snippet" TEXT NOT NULL,
    "status" "DetectionStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "remediation_steps" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secret_detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_secrets" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "encrypted_payload" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "password_hash" TEXT,
    "payload_type" "SharedSecretType" NOT NULL DEFAULT 'ENV_VARIABLES',
    "file_name" TEXT,
    "mime_type" TEXT,
    "status" "SharedSecretStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "viewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shared_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secret_files" (
    "id" UUID NOT NULL,
    "environment_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "encrypted_content" BYTEA NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "secret_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secret_file_versions" (
    "id" UUID NOT NULL,
    "secret_file_id" UUID NOT NULL,
    "encrypted_content" BYTEA NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "changed_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secret_file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "password_hash" TEXT,
    "avatar_url" TEXT,
    "github_id" TEXT,
    "github_username" TEXT,
    "github_access_token" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" TEXT,
    "password_reset_token" TEXT,
    "password_reset_expires_at" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_family" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_project_id_created_at_idx" ON "audit_logs"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "ci_tokens_token_hash_key" ON "ci_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "ci_tokens_project_id_idx" ON "ci_tokens"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "vault_groups_project_id_name_key" ON "vault_groups"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "environments_vault_group_id_type_key" ON "environments"("vault_group_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "env_variables_environment_id_key_key" ON "env_variables"("environment_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "env_templates_project_id_name_key" ON "env_templates"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "env_template_variables_template_id_key_key" ON "env_template_variables"("template_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "license_rules_project_id_license_id_key" ON "license_rules"("project_id", "license_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "secret_detections_project_id_status_idx" ON "secret_detections"("project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "shared_secrets_token_key" ON "shared_secrets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "secret_files_environment_id_name_key" ON "secret_files"("environment_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "dependencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_dependency_id_fkey" FOREIGN KEY ("dependency_id") REFERENCES "dependencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_tokens" ADD CONSTRAINT "ci_tokens_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_tokens" ADD CONSTRAINT "ci_tokens_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_tokens" ADD CONSTRAINT "ci_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_groups" ADD CONSTRAINT "vault_groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_vault_group_id_fkey" FOREIGN KEY ("vault_group_id") REFERENCES "vault_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "env_variables" ADD CONSTRAINT "env_variables_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "env_variable_versions" ADD CONSTRAINT "env_variable_versions_variable_id_fkey" FOREIGN KEY ("variable_id") REFERENCES "env_variables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "env_templates" ADD CONSTRAINT "env_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "env_templates" ADD CONSTRAINT "env_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "env_template_variables" ADD CONSTRAINT "env_template_variables_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "env_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_rules" ADD CONSTRAINT "license_rules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_patterns" ADD CONSTRAINT "scan_patterns_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_scans" ADD CONSTRAINT "secret_scans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_scans" ADD CONSTRAINT "secret_scans_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_detections" ADD CONSTRAINT "secret_detections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_detections" ADD CONSTRAINT "secret_detections_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "secret_scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_detections" ADD CONSTRAINT "secret_detections_scan_pattern_id_fkey" FOREIGN KEY ("scan_pattern_id") REFERENCES "scan_patterns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_detections" ADD CONSTRAINT "secret_detections_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_secrets" ADD CONSTRAINT "shared_secrets_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_secrets" ADD CONSTRAINT "shared_secrets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_files" ADD CONSTRAINT "secret_files_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_files" ADD CONSTRAINT "secret_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_file_versions" ADD CONSTRAINT "secret_file_versions_secret_file_id_fkey" FOREIGN KEY ("secret_file_id") REFERENCES "secret_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
