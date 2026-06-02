-- Share links are file-only now: drop the payloadType discriminator (config/secret are both just files).
ALTER TABLE "shared_secrets" DROP COLUMN "payload_type";
DROP TYPE "SharedSecretType";
