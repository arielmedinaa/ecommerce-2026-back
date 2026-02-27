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
var CommunicationService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const service_discovery_service_1 = require("@shared/common/services/service-discovery.service");
let CommunicationService = CommunicationService_1 = class CommunicationService {
    constructor(serviceDiscovery, configService) {
        this.serviceDiscovery = serviceDiscovery;
        this.configService = configService;
        this.logger = new common_1.Logger(CommunicationService_1.name);
    }
    async communicateWithService(serviceName, pattern, data, clientProxy) {
        this.logger.log(`Iniciando comunicación con ${serviceName}`);
        this.logger.log(`Patrón: ${JSON.stringify(pattern)}`);
        this.logger.log(`Datos: ${JSON.stringify(data)}`);
        try {
            if (clientProxy) {
                this.logger.log(`Usando comunicación TCP con ${serviceName}`);
                const result = await clientProxy.send(pattern, data).toPromise();
                this.logger.log(`Comunicación TCP exitosa con ${serviceName}`);
                return result;
            }
        }
        catch (tcpError) {
            this.logger.warn(`Error en comunicación TCP con ${serviceName}: ${tcpError.message}`);
            return this.communicateViaHttp(serviceName, pattern, data, tcpError);
        }
    }
    async communicateViaHttp(serviceName, pattern, data, originalError) {
        try {
            const serviceUrl = this.serviceDiscovery.getServiceUrlByName(serviceName);
            const axios = require('axios');
            const httpEndpoint = this.buildHttpEndpoint(pattern);
            let fullUrl;
            if (this.serviceDiscovery.getRunMode() === 'all') {
                const servicePort = this.serviceDiscovery.getServicePort(serviceName);
                fullUrl = `http://${serviceUrl}:${servicePort}${httpEndpoint}`;
            }
            else {
                fullUrl = `${serviceUrl}${httpEndpoint}`;
            }
            this.logger.log(`Fallback a HTTP con ${serviceName}`);
            this.logger.log(`URL: ${fullUrl}`);
            const response = await axios.post(fullUrl, data, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Service-Communication': 'tcp-fallback',
                },
            });
            this.logger.log(`Comunicación HTTP exitosa con ${serviceName}`);
            return response.data;
        }
        catch (httpError) {
            this.logger.error(`Error CRÍTICO: Falló TCP y HTTP con ${serviceName}`);
            this.logger.error(`Error TCP: ${originalError?.message}`);
            this.logger.error(`Error HTTP: ${httpError.message}`);
            throw new Error(`No se pudo comunicar con ${serviceName}. ` +
                `TCP falló: ${originalError?.message}. ` +
                `HTTP falló: ${httpError.message}`);
        }
    }
    buildHttpEndpoint(pattern) {
        const patternMap = {
            'get_products': '/products/list',
            'get_all_banners': '/image/banner/list',
            'upload_banner': '/image/banner/upload',
            'get_cart': '/cart/user',
            'create_cart': '/cart/create',
            'authenticate': '/auth/login',
            'get_user': '/auth/profile',
        };
        const cmd = pattern?.cmd || pattern;
        const endpoint = patternMap[cmd] || '/generic';
        this.logger.log(`Patrón TCP ${cmd} -> Endpoint HTTP ${endpoint}`);
        return endpoint;
    }
    async checkServiceBeforeCommunication(serviceName) {
        this.logger.log(`Verificando disponibilidad de ${serviceName} antes de comunicar...`);
        const isAvailable = this.serviceDiscovery.isServiceAvailable(serviceName);
        if (!isAvailable) {
            this.logger.warn(`Servicio ${serviceName} no disponible, intentando refrescar...`);
            await this.serviceDiscovery.refreshServices();
            const stillUnavailable = !this.serviceDiscovery.isServiceAvailable(serviceName);
            if (stillUnavailable) {
                this.logger.error(`Servicio ${serviceName} sigue no disponible después de refrescar`);
                return false;
            }
        }
        this.logger.log(`Servicio ${serviceName} disponible para comunicación`);
        return true;
    }
    async communicateWithRetry(serviceName, pattern, data, clientProxy, maxRetries = 3) {
        this.logger.log(`Iniciando comunicación con ${maxRetries} reintentos máximos`);
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.log(`Intento ${attempt}/${maxRetries} para ${serviceName}`);
                const isAvailable = await this.checkServiceBeforeCommunication(serviceName);
                if (!isAvailable) {
                    throw new Error(`Servicio ${serviceName} no disponible`);
                }
                const result = await this.communicateWithService(serviceName, pattern, data, clientProxy);
                this.logger.log(`Comunicación exitosa con ${serviceName} en el intento ${attempt}`);
                return result;
            }
            catch (error) {
                this.logger.warn(`Intento ${attempt}/${maxRetries} fallido para ${serviceName}: ${error.message}`);
                if (attempt === maxRetries) {
                    this.logger.error(`Todos los intentos fallidos para ${serviceName}`);
                    throw error;
                }
                const delay = attempt * 1000;
                this.logger.log(`Esperando ${delay}ms antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    getCommunicationStats() {
        const allServices = this.serviceDiscovery.getAllServices();
        const availableServices = this.serviceDiscovery.getAvailableServices();
        const stats = {
            total: allServices.length,
            available: availableServices.length,
            unavailable: allServices.length - availableServices.length,
            runMode: this.serviceDiscovery.getRunMode(),
            services: allServices.map(s => ({
                name: s.name,
                url: s.url,
                available: s.available,
                port: s.port,
            })),
        };
        this.logger.log(`📊 Estadísticas de comunicación: ${JSON.stringify(stats, null, 2)}`);
        return stats;
    }
};
exports.CommunicationService = CommunicationService;
exports.CommunicationService = CommunicationService = CommunicationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeof (_a = typeof service_discovery_service_1.ServiceDiscoveryService !== "undefined" && service_discovery_service_1.ServiceDiscoveryService) === "function" ? _a : Object, config_1.ConfigService])
], CommunicationService);
//# sourceMappingURL=communication.service.js.map