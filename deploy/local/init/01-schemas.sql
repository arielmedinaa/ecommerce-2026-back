-- Init de MariaDB local (docker-compose) — se ejecuta solo en el PRIMER arranque
-- (MariaDB corre todo .sql en /docker-entrypoint-initdb.d/ por orden alfabético).
--
-- Crea los schemas por dominio (database-per-service) y da permisos al usuario `ecommerce`.
-- El schema `ecommerce` ya lo crea la imagen vía MARIADB_DATABASE; acá creamos el resto.

CREATE DATABASE IF NOT EXISTS auth_db     CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE DATABASE IF NOT EXISTS cart_db     CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE DATABASE IF NOT EXISTS content_db  CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE DATABASE IF NOT EXISTS payments_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE DATABASE IF NOT EXISTS image_db    CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE DATABASE IF NOT EXISTS products_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- Permisos para el usuario de la app (creado por la imagen como MARIADB_USER=ecommerce).
GRANT ALL PRIVILEGES ON auth_db.*     TO 'ecommerce'@'%';
GRANT ALL PRIVILEGES ON cart_db.*     TO 'ecommerce'@'%';
GRANT ALL PRIVILEGES ON content_db.*  TO 'ecommerce'@'%';
GRANT ALL PRIVILEGES ON payments_db.* TO 'ecommerce'@'%';
GRANT ALL PRIVILEGES ON image_db.*    TO 'ecommerce'@'%';
GRANT ALL PRIVILEGES ON products_db.* TO 'ecommerce'@'%';
GRANT ALL PRIVILEGES ON ecommerce.*   TO 'ecommerce'@'%';
FLUSH PRIVILEGES;
