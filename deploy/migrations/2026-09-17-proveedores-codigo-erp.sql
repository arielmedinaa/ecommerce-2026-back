-- 2026-09-17 — Vínculo del proveedor del panel con el proveedor del ERP.
--
-- El orden del catálogo usa cs_score_proveedor (ERP, ssss_emp1), cuya PK es el
-- código de proveedor del ERP. La tabla `proveedores` de worker-RDS no tenía
-- forma de llegar a ese código: sólo guarda nombre, email y ruc. Sin este
-- vínculo los productos del panel no pueden ordenarse por score y caen al
-- último tramo, igual que un proveedor del ERP sin clasificación.
--
-- Queda NULL a propósito: hay que cargarlo por proveedor. Mientras esté NULL el
-- producto se ordena sin score (tier 1), que es el comportamiento actual.

ALTER TABLE proveedores
  ADD COLUMN codigo_erp INT NULL COMMENT 'proveedor.codigo en el ERP (ssss_emp1) — clave para cs_score_proveedor';

CREATE INDEX idx_proveedores_codigo_erp ON proveedores (codigo_erp);
