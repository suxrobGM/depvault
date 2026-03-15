-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'INVITATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'MEMBER_REMOVED';

-- CreateTable
CREATE TABLE "project_invitations" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "user_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_invitations_token_key" ON "project_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "project_invitations_project_id_email_status_key" ON "project_invitations"("project_id", "email", "status");

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_invitations" ADD CONSTRAINT "project_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
