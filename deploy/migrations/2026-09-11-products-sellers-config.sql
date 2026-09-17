ALTER TABLE products_sellers
  ADD COLUMN deposito VARCHAR(255) NULL,
  ADD COLUMN disponible_retiro_inmediato TINYINT(1) NULL,
  ADD COLUMN tiempo_preparacion_horas INT NULL,
  ADD COLUMN peso_kg DECIMAL(10,2) NULL,
  ADD COLUMN dimensiones_cm VARCHAR(255) NULL,
  ADD COLUMN garantia_meses INT NULL,
  ADD COLUMN condicion_producto VARCHAR(255) NULL,
  ADD COLUMN video_url VARCHAR(500) NULL,
  ADD COLUMN ficha_tecnica_url VARCHAR(500) NULL,
  ADD COLUMN color_variante VARCHAR(255) NULL,
  ADD COLUMN unidad_venta VARCHAR(255) NULL,
  ADD COLUMN observaciones_proveedor TEXT NULL;

CREATE TABLE products_sellers_columnas_activas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_proveedor INT NOT NULL,
  columna VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_proveedor_columna (id_proveedor, columna),
  KEY idx_id_proveedor (id_proveedor)
);

CREATE TABLE stock_minimo_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_proveedor INT NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  codigo_familia VARCHAR(50) NULL,
  codigo_articulo VARCHAR(50) NULL,
  fecha_desde DATE NULL,
  fecha_hasta DATE NULL,
  stock_minimo INT NOT NULL,
  stock_casi_bajo INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_id_proveedor (id_proveedor)
);

SHOW COLUMNS FROM products_sellers LIKE 'deposito';
SHOW TABLES LIKE 'products_sellers_columnas_activas';
SHOW TABLES LIKE 'stock_minimo_config';
