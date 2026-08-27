import { Module, Injectable } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

/**
 * Conexión de solo-lectura a `cart_db` — la base propia del microservicio
 * `cart`. Vive en el MISMO servidor MariaDB que `content_db`
 * ("database-per-service", un solo server físico, un schema por servicio —
 * ver `deploy/k8s/dev/{cart,content}.yaml`), por eso reusa el mismo
 * host/usuario/clave de `content-service` y solo cambia el nombre de la
 * base. Calcada de `EcontDatabaseService` (misma forma, mismo patrón de
 * abrir/cerrar conexión por consulta).
 */
@Injectable()
export class CartDatabaseService {
  private readonly config = {
    host: process.env.DATABASE_HOST || 'mariadb',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USER || 'ecommerce',
    password: process.env.DATABASE_PASSWORD || 'ecommerce',
    database: process.env.CART_DB_DATABASE || 'cart_db',
  };

  async executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    let connection: mysql.Connection | null = null;
    try {
      connection = await mysql.createConnection(this.config);
      const [rows] = await connection.execute(query, params);
      return rows as T[];
    } finally {
      if (connection) await connection.end();
    }
  }
}

@Module({
  providers: [CartDatabaseService],
  exports: [CartDatabaseService],
})
export class CartDatabaseModule {}
