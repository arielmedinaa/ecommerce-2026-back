import * as mysql from 'mysql2/promise';
export declare class EcontDatabaseService {
    private readonly config;
    executeQuery<T = any>(query: string, params?: any[]): Promise<T[]>;
    executeProcedure<T = any>(procedureName: string, params?: any[]): Promise<T[]>;
    executeInsert(query: string, params?: any[]): Promise<mysql.ResultSetHeader>;
    executeUpdate(query: string, params?: any[]): Promise<mysql.ResultSetHeader>;
    executeDelete(query: string, params?: any[]): Promise<mysql.ResultSetHeader>;
    testConnection(): Promise<boolean>;
}
export declare class EcontDatabaseModule {
}
