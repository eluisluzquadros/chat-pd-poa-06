-- Remove all sensitive secrets from the database to allow project remix
-- This will clear the secrets table while preserving its structure

DELETE FROM secrets WHERE TRUE;

-- Optional: If you want to completely remove the table, uncomment the line below
-- DROP TABLE IF EXISTS secrets CASCADE;