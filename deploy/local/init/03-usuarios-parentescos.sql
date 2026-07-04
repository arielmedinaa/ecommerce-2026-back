-- Migración: agrega la columna `parentescos` (LONGTEXT) a usuarios para guardar las
-- referencias familiares del cliente (JSON: [{nombre,parentesco,celular}]) usadas en
-- las solicitudes a crédito. Idempotente.

USE auth_db;

SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE table_schema = 'auth_db'
    AND table_name = 'usuarios'
    AND column_name = 'parentescos'
);
SET @sql := IF(@col = 0,
  'ALTER TABLE usuarios ADD COLUMN parentescos LONGTEXT NULL',
  'SELECT "columna parentescos ya existe" AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
