ALTER TABLE productos_sello
  ADD COLUMN regla_id INT NULL,
  ADD KEY idx_productos_sello_regla_id (regla_id);

CREATE TABLE sellos_reglas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NULL,
  filtro_categoria VARCHAR(255) NULL,
  filtro_marca VARCHAR(255) NULL,
  filtro_proveedor VARCHAR(255) NULL,
  filtro_precio_min DECIMAL(14,2) NULL,
  filtro_precio_max DECIMAL(14,2) NULL,
  url_sello VARCHAR(500) NOT NULL,
  nombre_archivo VARCHAR(255) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_desde DATETIME NULL,
  fecha_hasta DATETIME NULL,
  created_by VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sellos_reglas_activo (activo)
);
