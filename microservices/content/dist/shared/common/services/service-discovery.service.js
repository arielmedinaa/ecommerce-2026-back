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
var ServiceDiscoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceDiscoveryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ServiceDiscoveryService = ServiceDiscoveryService_1 = class ServiceDiscoveryService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(ServiceDiscoveryService_1.name);
        this.services = new Map();
        this.isAllServicesMode = this.configService.get('RUN_MODE', 'single') === 'all';
        this.logger.log(`Modo de ejecución: ${this.isAllServicesMode ? 'TODOS los servicios' : 'UN servicio individual'}`);
        this.initializeServices();
    }
    initializeServices() {
        this.logger.log('Inicializando registro de microservicios...');
        const servicesConfig = [
            { name: 'AUTH_SERVICE', port: 3101, envKey: 'AUTH_SERVICE_URL' },
            { name: 'CART_SERVICE', port: 3102, envKey: 'CART_SERVICE_URL' },
            { name: 'CONTENT_SERVICE', port: 3103, envKey: 'CONTENT_SERVICE_URL' },
            { name: 'ORDERS_SERVICE', port: 3104, envKey: 'ORDERS_SERVICE_URL' },
            { name: 'PAYMENTS_SERVICE', port: 3105, envKey: 'PAYMENTS_SERVICE_URL' },
            { name: 'PRODUCTS_SERVICE', port: 3106, envKey: 'PRODUCTS_SERVICE_URL' },
            { name: 'IMAGE_SERVICE', port: 4093, envKey: 'IMAGE_SERVICE_URL' },
        ];
        servicesConfig.forEach(service => {
            this.services.set(service.name, {
                name: service.name,
                url: this.getServiceUrl(service.name, service.port, service.envKey),
                port: service.port,
                host: this.getServiceHost(service.name),
                available: false,
            });
            this.logger.log(`Servicio ${service.name} configurado en puerto ${service.port}`);
        });
        this.checkServicesAvailability();
    }
    getServiceUrl(serviceName, defaultPort, envKey) {
        const envUrl = this.configService.get(envKey);
        if (envUrl) {
            this.logger.log(`Usando URL de entorno para ${serviceName}: ${envUrl}`);
            return envUrl;
        }
        if (this.isAllServicesMode) {
            const cleanServiceName = serviceName.replace('_SERVICE', '').toLowerCase();
            const dockerUrl = `deploy-${cleanServiceName}-1`;
            this.logger.log(`Modo Docker Compose - ${serviceName} -> ${dockerUrl}`);
            return dockerUrl;
        }
        const localhostUrl = `http://localhost:${defaultPort}`;
        this.logger.log(`Modo desarrollo individual - ${serviceName} -> ${localhostUrl}`);
        return localhostUrl;
    }
    getServicePort(serviceName) {
        const service = this.services.get(serviceName);
        if (service) {
            return service.port;
        }
        const defaultPorts = {
            'AUTH_SERVICE': 3101,
            'CART_SERVICE': 3102,
            'CONTENT_SERVICE': 3103,
            'ORDERS_SERVICE': 3104,
            'PAYMENTS_SERVICE': 3105,
            'PRODUCTS_SERVICE': 3106,
            'IMAGE_SERVICE': 3107,
        };
        return defaultPorts[serviceName] || 3000;
    }
    getServiceHost(serviceName) {
        if (this.isAllServicesMode) {
            const cleanServiceName = serviceName.replace('_SERVICE', '').toLowerCase();
            const dockerHost = `deploy-${cleanServiceName}-1`;
            this.logger.log(`Host Docker para ${serviceName}: ${dockerHost}`);
            return dockerHost;
        }
        this.logger.log(`Host localhost para ${serviceName}`);
        return 'localhost';
    }
    async checkServicesAvailability() {
        this.logger.log('🔍 Verificando disponibilidad de servicios...');
        const checks = Array.from(this.services.values()).map(async (service) => {
            try {
                const axios = require('axios');
                await axios.get(`${service.url}/health`, { timeout: 2000 });
                service.available = true;
                this.logger.log(`Servicio ${service.name} DISPONIBLE en ${service.url}`);
            }
            catch (error) {
                service.available = false;
                this.logger.warn(`Servicio ${service.name} NO DISPONIBLE en ${service.url}`);
                this.logger.debug(`Error detalle: ${error.message}`);
            }
        });
        await Promise.allSettled(checks);
        const availableCount = Array.from(this.services.values()).filter(s => s.available).length;
        const totalCount = this.services.size;
        this.logger.log(`Resumen: ${availableCount}/${totalCount} servicios disponibles`);
    }
    getServiceInfo(serviceName) {
        const service = this.services.get(serviceName);
        if (!service) {
            this.logger.warn(`Servicio ${serviceName} no encontrado en el registro`);
        }
        return service;
    }
    getServiceUrlByName(serviceName) {
        const service = this.services.get(serviceName);
        const url = service?.url || 'http://localhost:3100';
        this.logger.log(`URL obtenida para ${serviceName}: ${url}`);
        return url;
    }
    isServiceAvailable(serviceName) {
        const service = this.services.get(serviceName);
        const available = service?.available || false;
        this.logger.log(`Disponibilidad de ${serviceName}: ${available ? 'DISPONIBLE' : 'NO DISPONIBLE'}`);
        return available;
    }
    getAllServices() {
        const allServices = Array.from(this.services.values());
        this.logger.log(`Total de servicios registrados: ${allServices.length}`);
        return allServices;
    }
    getAvailableServices() {
        const availableServices = Array.from(this.services.values()).filter(s => s.available);
        this.logger.log(`Servicios disponibles: ${availableServices.length}`);
        return availableServices;
    }
    registerService(serviceName, url, port) {
        this.services.set(serviceName, {
            name: serviceName,
            url,
            port,
            host: new URL(url).hostname,
            available: true,
        });
        this.logger.log(`Servicio ${serviceName} REGISTRADO manualmente en ${url}:${port}`);
    }
    async refreshServices() {
        this.logger.log('Refrescando disponibilidad de servicios...');
        await this.checkServicesAvailability();
    }
    isAllServicesModeEnabled() {
        return this.isAllServicesMode;
    }
    getRunMode() {
        const mode = this.isAllServicesMode ? 'all' : 'single';
        this.logger.log(`Modo de ejecución actual: ${mode}`);
        return mode;
    }
    getServicesByStatus(status) {
        switch (status) {
            case 'available':
                return this.getAvailableServices();
            case 'unavailable':
                return Array.from(this.services.values()).filter(s => !s.available);
            case 'all':
            default:
                return this.getAllServices();
        }
    }
    getServiceByPort(port) {
        const service = Array.from(this.services.values()).find(s => s.port === port);
        if (service) {
            this.logger.log(`Servicio encontrado por puerto ${port}: ${service.name}`);
        }
        return service;
    }
};
exports.ServiceDiscoveryService = ServiceDiscoveryService;
exports.ServiceDiscoveryService = ServiceDiscoveryService = ServiceDiscoveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ServiceDiscoveryService);
//# sourceMappingURL=service-discovery.service.js.map