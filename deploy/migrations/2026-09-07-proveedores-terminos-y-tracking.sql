-- Trazabilidad de aceptación de Términos y Condiciones + hitos del proveedor:
--
--   terminos_aceptados     -> el proveedor marcó el check en el login
--   terminos_aceptados_at  -> cuándo lo aceptó (primera vez; no se pisa)
--   primer_login_at        -> primer ingreso exitoso al panel (no se pisa)
--   ultimo_login_at        -> último ingreso exitoso (se actualiza siempre)
--   primera_carga_productos_at -> cuándo subió su primera tanda de productos
--                                 (primer excel importado con al menos 1 alta;
--                                 no se pisa)
--
-- Target: worker-rds 10.116.0.7, base `ecommerce` (NO el ERP ssss_emp1).
-- Aditiva y nullable/con default: no bloquea lecturas ni rompe el código en
-- producción (products-service actual ignora las columnas hasta que se
-- despliegue el nuevo).
--
-- IMPORTANTE: correr ESTO ANTES de desplegar products-service y api-gateway,
-- no después. El código nuevo lee y escribe estas columnas; si no existen,
-- TypeORM falla.

ALTER TABLE proveedores
  ADD COLUMN terminos_aceptados TINYINT(1) NOT NULL DEFAULT 0 AFTER activo,
  ADD COLUMN terminos_aceptados_at DATETIME(6) NULL AFTER terminos_aceptados,
  ADD COLUMN primer_login_at DATETIME(6) NULL AFTER terminos_aceptados_at,
  ADD COLUMN ultimo_login_at DATETIME(6) NULL AFTER primer_login_at,
  ADD COLUMN primera_carga_productos_at DATETIME(6) NULL AFTER ultimo_login_at;

-- Verificación
SHOW COLUMNS FROM proveedores LIKE '%login%';
SHOW COLUMNS FROM proveedores LIKE 'terminos%';
SHOW COLUMNS FROM proveedores LIKE 'primera_carga%';
