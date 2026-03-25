-- AlterTable
ALTER TABLE "user_vaults" ADD COLUMN     "wrapped_recovery_key" TEXT,
ADD COLUMN     "wrapped_recovery_key_iv" TEXT,
ADD COLUMN     "wrapped_recovery_key_tag" TEXT;
