-- Rename legacy env-variable enum identifiers to the config-file model.
ALTER TYPE "AuditResourceType" RENAME VALUE 'ENV_VARIABLE' TO 'CONFIG_FILE';
ALTER TYPE "SharedSecretType" RENAME VALUE 'ENV_VARIABLES' TO 'CONFIG_FILE';
