import { Module, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mysql from 'mysql2/promise';

@Injectable()
export class MariaDbService {
  private readonly config: mysql.ConnectionOptions;

  constructor(private configService: ConfigService) {
    this.config = {
      host: configService.get<string>('MARIA_DB_HOST') || '192.168.100.209',
      port: parseInt(configService.get<string>('MARIA_DB_PORT') || '3306'),
      user: configService.get<string>('MARIA_DB_USER') || 'root',
      password: configService.get<string>('MARIA_DB_PASSWORD') || 'classicS',
      database: configService.get<string>('MARIA_DB_DATABASE') || 'ecommerce',
      connectionLimit: 10,
    };
  }

  async executeQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      
      const [rows] = await connection.execute(query, params);
      return rows as T[];
    } catch (error) {
      console.error('Error executing MariaDB query:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async executeInsert(query: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      
      const [result] = await connection.execute(query, params);
      return result as mysql.ResultSetHeader;
    } catch (error) {
      console.error('Error inserting into MariaDB:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async executeUpdate(query: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      
      const [result] = await connection.execute(query, params);
      return result as mysql.ResultSetHeader;
    } catch (error) {
      console.error('Error updating MariaDB:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async executeDelete(query: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      
      const [result] = await connection.execute(query, params);
      return result as mysql.ResultSetHeader;
    } catch (error) {
      console.error('Error deleting from MariaDB:', error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async testConnection(): Promise<boolean> {
    let connection: mysql.Connection | null = null;
    
    try {
      connection = await mysql.createConnection(this.config);
      await connection.ping();
      console.log('MariaDB connection successful');
      return true;
    } catch (error) {
      console.error('Error connecting to MariaDB:', error);
      return false;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}

@Module({
  providers: [MariaDbService],
  exports: [MariaDbService],
})
export class MariaDbModule {}
