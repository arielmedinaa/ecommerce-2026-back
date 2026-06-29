import { Module, Injectable } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class EcontDatabaseService {
  private readonly config = {
    host: process.env.ECONT_DB_HOST || '192.168.100.178',
    port: parseInt(process.env.ECONT_DB_PORT || '3306'),
    user: process.env.ECONT_DB_USER || 'root',
    password: process.env.ECONT_DB_PASSWORD || 'pass2025',
    database: process.env.ECONT_DB_DATABASE || 'ssss_emp1',
    connectionLimit: 100,
  };

  async executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      console.log('Conectando a la base de datos de Econt');
      
      const [rows] = await connection.execute(query, params);
      return rows as T[];
    } catch (error) {
      console.error('Error al ejecutar la query:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
        console.log('Conexión a la base de datos de Econt cerrada');
      }
    }
  }

  async executeProcedure<T = any>(procedureName: string, params?: any[]): Promise<T[]> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      console.log('Conectando a la base de datos de Econt');
      
      const paramPlaceholders = params ? params.map(() => '?').join(', ') : '';
      const query = `CALL ${procedureName}(${paramPlaceholders})`;
      
      const [rows] = await connection.execute(query, params);
      return rows as T[];
    } catch (error) {
      console.error('Error al ejecutar la procedure:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
        console.log('Conexión a la base de datos de Econt cerrada');
      }
    }
  }

  async executeInsert(query: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      console.log('Conectando a la base de datos de Econt');
      
      const [result] = await connection.execute(query, params);
      return result as mysql.ResultSetHeader;
    } catch (error) {
      console.error('Error al insertar:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
        console.log('Conexión a la base de datos de Econt cerrada');
      }
    }
  }

  async executeUpdate(query: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      console.log('Conectando a la base de datos de Econt');
      
      const [result] = await connection.execute(query, params);
      return result as mysql.ResultSetHeader;
    } catch (error) {
      console.error('Error al actualizar:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
        console.log('Conexión a la base de datos de Econt cerrada');
      }
    }
  }

  async executeDelete(query: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      console.log('Conectando a la base de datos de Econt');
      
      const [result] = await connection.execute(query, params);
      return result as mysql.ResultSetHeader;
    } catch (error) {
      console.error('Error al eliminar:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
        console.log('Conexión a la base de datos de Econt cerrada');
      }
    }
  }

  async testConnection(): Promise<boolean> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      await connection.ping();
      console.log('Conexión a la base de datos de Econt exitosa');
      return true;
    } catch (error) {
      console.error('Error al conectar a la base de datos de Econt:', error);
      return false;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}

@Module({
  providers: [EcontDatabaseService],
  exports: [EcontDatabaseService],
})
export class EcontDatabaseModule {}