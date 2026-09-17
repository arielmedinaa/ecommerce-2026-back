ALTER TABLE products_sellers
  ADD COLUMN erp_articulo_match VARCHAR(50) NULL,
  ADD COLUMN erp_match_score INT NULL,
  ADD COLUMN erp_match_status VARCHAR(20) NOT NULL DEFAULT 'sin_match',
  ADD COLUMN erp_match_motivo VARCHAR(500) NULL,
  ADD COLUMN erp_match_evaluado_at DATETIME NULL,
  ADD INDEX idx_erp_match_status (erp_match_status);

SHOW COLUMNS FROM products_sellers LIKE 'erp_match_status';
