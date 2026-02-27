"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var HealthController_1;
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const service_discovery_service_1 = require("@shared/common/services/service-discovery.service");
const communication_service_1 = require("@shared/common/services/communication.service");
let HealthController = HealthController_1 = class HealthController {
    constructor(serviceDiscovery, communicationService) {
        this.serviceDiscovery = serviceDiscovery;
        this.communicationService = communicationService;
        this.logger = new common_1.Logger(HealthController_1.name);
        this.logger.log('Health Controller inicializado');
    }
    getHealth() {
        const serviceName = process.env.SERVICE_NAME || 'unknown';
        const port = process.env.PORT || 'unknown';
        this.logger.log(`Health check solicitado para ${serviceName} en puerto ${port}`);
        return {
            status: 'ok',
            service: serviceName,
            port: parseInt(port),
            timestamp: new Date().toISOString(),
            mode: this.serviceDiscovery.getRunMode(),
            message: `Servicio ${serviceName} funcionando correctamente`,
        };
    }
    getDetailedHealth() {
        const serviceName = process.env.SERVICE_NAME || 'unknown';
        const port = process.env.PORT || 'unknown';
        this.logger.log(`Health detallado solicitado para ${serviceName}`);
        return {
            status: 'ok',
            service: serviceName,
            port: parseInt(port),
            timestamp: new Date().toISOString(),
            mode: this.serviceDiscovery.getRunMode(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            message: `Servicio ${serviceName} funcionando correctamente`,
        };
    }
    getServices() {
        this.logger.log('Petición de descubrimiento de servicios recibida');
        const services = this.serviceDiscovery.getAllServices();
        const stats = this.communicationService.getCommunicationStats();
        return {
            message: 'Lista de servicios registrados',
            services: services,
            stats: stats,
            timestamp: new Date().toISOString(),
        };
    }
    async checkService(serviceName) {
        this.logger.log(`Verificando servicio específico: ${serviceName}`);
        const serviceInfo = this.serviceDiscovery.getServiceInfo(serviceName);
        const isAvailable = this.serviceDiscovery.isServiceAvailable(serviceName);
        if (!serviceInfo) {
            return {
                status: 'error',
                message: `Servicio ${serviceName} no encontrado en el registro`,
                timestamp: new Date().toISOString(),
            };
        }
        return {
            status: isAvailable ? 'available' : 'unavailable',
            service: serviceInfo,
            timestamp: new Date().toISOString(),
            message: `Servicio ${serviceName} está ${isAvailable ? 'disponible' : 'no disponible'}`,
        };
    }
    async refreshServices() {
        this.logger.log('🔄 Solicitud de refresco de servicios recibida');
        try {
            await this.serviceDiscovery.refreshServices();
            return {
                status: 'success',
                message: 'Servicios refrescados exitosamente',
                timestamp: new Date().toISOString(),
                services: this.serviceDiscovery.getAllServices(),
            };
        }
        catch (error) {
            this.logger.error(`❌ Error refrescando servicios: ${error.message}`);
            return {
                status: 'error',
                message: 'Error refrescando servicios',
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }
    async testCommunication(serviceName, pattern = { cmd: 'ping' }, data = { test: true }) {
        this.logger.log(`🧪 Prueba de comunicación solicitada con ${serviceName}`);
        try {
            const result = await this.communicationService.communicateWithRetry(serviceName, pattern, data, null, 2);
            return {
                status: 'success',
                message: `Comunicación exitosa con ${serviceName}`,
                service: serviceName,
                pattern: pattern,
                data: data,
                result: result,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            this.logger.error(`❌ Prueba de comunicación fallida con ${serviceName}: ${error.message}`);
            return {
                status: 'error',
                message: `Error en comunicación con ${serviceName}`,
                service: serviceName,
                pattern: pattern,
                data: data,
                error: error.message,
                timestamp: new Date().toISOString(),
            };
        }
    }
};
exports.HealthController = HealthController;
exports.HealthController = HealthController = HealthController_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof service_discovery_service_1.ServiceDiscoveryService !== "undefined" && service_discovery_service_1.ServiceDiscoveryService) === "function" ? _a : Object, typeof (_b = typeof communication_service_1.CommunicationService !== "undefined" && communication_service_1.CommunicationService) === "function" ? _b : Object])
], HealthController);
//# sourceMappingURL=health.controller.js.map