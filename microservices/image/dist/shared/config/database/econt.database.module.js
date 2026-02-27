"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcontDatabaseModule = exports.EcontDatabaseService = void 0;
const common_1 = require("@nestjs/common");
const mysql = require("mysql2/promise");
let EcontDatabaseService = class EcontDatabaseService {
    constructor() {
        this.config = {
            host: process.env.ECONT_DB_HOST || '192.168.100.178',
            port: parseInt(process.env.ECONT_DB_PORT || '3306'),
            user: process.env.ECONT_DB_USER || 'root',
            password: process.env.ECONT_DB_PASSWORD || 'pass2025',
            database: process.env.ECONT_DB_DATABASE || 'ssss_emp1',
            connectionLimit: 100,
        };
    }
    async executeQuery(query, params) {
        let connection = null;
        try {
            connection = await mysql.createConnection(this.config);
            console.log('Conectando a la base de datos de Econt');
            const [rows] = await connection.execute(query, params);
            return rows;
        }
        catch (error) {
            console.error('Error al ejecutar la query:', error);
            throw error;
        }
        finally {
            if (connection) {
                await connection.end();
                console.log('Conexión a la base de datos de Econt cerrada');
            }
        }
    }
    async executeProcedure(procedureName, params) {
        let connection = null;
        try {
            connection = await mysql.createConnection(this.config);
            console.log('Conectando a la base de datos de Econt');
            const paramPlaceholders = params ? params.map(() => '?').join(', ') : '';
            const query = `CALL ${procedureName}(${paramPlaceholders})`;
            const [rows] = await connection.execute(query, params);
            return rows;
        }
        catch (error) {
            console.error('Error al ejecutar la procedure:', error);
            throw error;
        }
        finally {
            if (connection) {
                await connection.end();
                console.log('Conexión a la base de datos de Econt cerrada');
            }
        }
    }
    async executeInsert(query, params) {
        let connection = null;
        try {
            connection = await mysql.createConnection(this.config);
            console.log('Conectando a la base de datos de Econt');
            const [result] = await connection.execute(query, params);
            return result;
        }
        catch (error) {
            console.error('Error al insertar:', error);
            throw error;
        }
        finally {
            if (connection) {
                await connection.end();
                console.log('Conexión a la base de datos de Econt cerrada');
            }
        }
    }
    async executeUpdate(query, params) {
        let connection = null;
        try {
            connection = await mysql.createConnection(this.config);
            console.log('Conectando a la base de datos de Econt');
            const [result] = await connection.execute(query, params);
            return result;
        }
        catch (error) {
            console.error('Error al actualizar:', error);
            throw error;
        }
        finally {
            if (connection) {
                await connection.end();
                console.log('Conexión a la base de datos de Econt cerrada');
            }
        }
    }
    async executeDelete(query, params) {
        let connection = null;
        try {
            connection = await mysql.createConnection(this.config);
            console.log('Conectando a la base de datos de Econt');
            const [result] = await connection.execute(query, params);
            return result;
        }
        catch (error) {
            console.error('Error al eliminar:', error);
            throw error;
        }
        finally {
            if (connection) {
                await connection.end();
                console.log('Conexión a la base de datos de Econt cerrada');
            }
        }
    }
    async testConnection() {
        let connection = null;
        try {
            connection = await mysql.createConnection(this.config);
            await connection.ping();
            console.log('Conexión a la base de datos de Econt exitosa');
            return true;
        }
        catch (error) {
            console.error('Error al conectar a la base de datos de Econt:', error);
            return false;
        }
        finally {
            if (connection) {
                await connection.end();
            }
        }
    }
};
exports.EcontDatabaseService = EcontDatabaseService;
exports.EcontDatabaseService = EcontDatabaseService = __decorate([
    (0, common_1.Injectable)()
], EcontDatabaseService);
let EcontDatabaseModule = class EcontDatabaseModule {
};
exports.EcontDatabaseModule = EcontDatabaseModule;
exports.EcontDatabaseModule = EcontDatabaseModule = __decorate([
    (0, common_1.Module)({
        providers: [EcontDatabaseService],
        exports: [EcontDatabaseService],
    })
], EcontDatabaseModule);
//# sourceMappingURL=econt.database.module.js.map