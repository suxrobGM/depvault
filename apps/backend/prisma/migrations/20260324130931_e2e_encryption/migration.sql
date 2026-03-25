-- AlterTable
ALTER TABLE "ci_tokens" ADD COLUMN     "wrapped_dek" TEXT,
ADD COLUMN     "wrapped_dek_iv" TEXT,
ADD COLUMN     "wrapped_dek_tag" TEXT;

-- AlterTable
ALTER TABLE "device_codes" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "user_vaults" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kek_salt" TEXT NOT NULL,
    "kek_iterations" INTEGER NOT NULL DEFAULT 600000,
    "public_key" TEXT NOT NULL,
    "wrapped_private_key" TEXT NOT NULL,
    "wrapped_private_key_iv" TEXT NOT NULL,
    "wrapped_private_key_tag" TEXT NOT NULL,
    "recovery_key_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_vaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_key_grants" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "wrapped_dek" TEXT NOT NULL,
    "wrapped_dek_iv" TEXT NOT NULL,
    "wrapped_dek_tag" TEXT NOT NULL,
    "granter_public_key" TEXT,
    "grant_type" TEXT NOT NULL DEFAULT 'ECDH',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_key_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_vaults_user_id_key" ON "user_vaults"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_key_grants_project_id_user_id_grant_type_key" ON "project_key_grants"("project_id", "user_id", "grant_type");

-- AddForeignKey
ALTER TABLE "user_vaults" ADD CONSTRAINT "user_vaults_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_key_grants" ADD CONSTRAINT "project_key_grants_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_key_grants" ADD CONSTRAINT "project_key_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
