-- Separa el costo que declara el proveedor del precio que publicamos nosotros.
--
--   costo       -> dato de entrada, viene en la columna `costo` del excel
--   precioventa -> lo calculamos: costo * (1 + recargo/100), recargo del ERP
--                  (subfamilia.recargo, y si no hay, familia.recargo)
--
-- Target: worker-rds 10.116.0.7, base `ecommerce` (NO el ERP ssss_emp1).
-- Aditiva y nullable: no bloquea lecturas ni rompe el código en producción
-- (products-service actual ignora la columna hasta que se despliegue el nuevo).
--
-- IMPORTANTE: correr ESTO ANTES de desplegar products-service, no después.
-- El código nuevo lee y escribe `costo`; si la columna no existe, TypeORM falla.

ALTER TABLE products_sellers
  ADD COLUMN costo DECIMAL(15,2) NULL AFTER requiere_revision_categoria;

-- Verificación
SHOW COLUMNS FROM products_sellers LIKE 'costo';

-- Las 8 filas existentes quedan con costo = NULL a propósito.
--
-- Se podría reconstruir como precioventa / (1 + recargo/100), pero el recargo
-- vive en el ERP (otra base, otro host) y además hay una diferencia de 10%
-- sin explicar entre las dos corridas del 2026-09-03 (14:18 vs 19:35) que
-- haría que el backfill fije un número posiblemente equivocado.
--
-- Se rellenan solos en la próxima importación: la deduplicación nueva detecta
-- que el producto ya existe y actualiza stock y costo en lugar de insertar.
