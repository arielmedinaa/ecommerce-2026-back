-- Migración: garantiza a nivel DB que un usuario no pueda tener el mismo cupón
-- más de una vez (bug: "VeranoOFF" se asignó 3 veces al userId 112).
--
-- 1) Limpia duplicados existentes conservando el registro más reciente por
--    (userId, idCupon). 2) Crea el índice UNIQUE.
-- Idempotente: puede re-ejecutarse sin romper.

USE auth_db;

-- 1) Eliminar duplicados (deja el id más alto = más reciente).
DELETE t1 FROM usuarios_cupones t1
JOIN usuarios_cupones t2
  ON t1.userId = t2.userId
 AND t1.idCupon = t2.idCupon
 AND t1.id < t2.id;

-- 2) Crear el índice UNIQUE si aún no existe.
SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE table_schema = 'auth_db'
    AND table_name = 'usuarios_cupones'
    AND index_name = 'uq_user_cupon'
);
SET @sql := IF(@idx = 0,
  'ALTER TABLE usuarios_cupones ADD UNIQUE KEY uq_user_cupon (userId, idCupon)',
  'SELECT "uq_user_cupon ya existe" AS info');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
