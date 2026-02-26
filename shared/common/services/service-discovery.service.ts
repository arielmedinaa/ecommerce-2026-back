import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ServiceInfo {
  name: string;
  url: string;
  port: number;
  host: string;
  available: boolean;
}

@Injectable()
export class ServiceDiscoveryService {
  private readonly logger = new Logger(ServiceDiscoveryService.name);
  private services = new Map<string, ServiceInfo>();
  private isAllServicesMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isAllServicesMode = this.configService.get<string>('RUN_MODE', 'single') === 'all';
    this.logger.log(`Modo de ejecución: ${this.isAllServicesMode ? 'TODOS los servicios' : 'UN servicio individual'}`);
    this.initializeServices();
  }

  /**
   * Inicializa el registro de todos los microservicios
   */
  private initializeServices() {
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

  /**
   * Determina la URL de un servicio según el modo de ejecución
   * Prioridad: 1. Variable de entorno, 2. Modo todos juntos, 3. localhost
   */
  private getServiceUrl(serviceName: string, defaultPort: number, envKey: string): string {
    const envUrl = this.configService.get<string>(envKey);
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

  /**
   * Determina el host de un servicio según el modo de ejecución
   */
  private getServiceHost(serviceName: string): string {
    if (this.isAllServicesMode) {
      const cleanServiceName = serviceName.replace('_SERVICE', '').toLowerCase();
      const dockerHost = `deploy-${cleanServiceName}-1`;
      this.logger.log(`Host Docker para ${serviceName}: ${dockerHost}`);
      return dockerHost;
    }
    
    this.logger.log(`Host localhost para ${serviceName}`);
    return 'localhost';
  }

  /**
   * Verifica la disponibilidad de todos los servicios registrados
   */
  private async checkServicesAvailability() {
    this.logger.log('🔍 Verificando disponibilidad de servicios...');
    
    const checks = Array.from(this.services.values()).map(async (service) => {
      try {
        const axios = require('axios');
        await axios.get(`${service.url}/health`, { timeout: 2000 });
        service.available = true;
        this.logger.log(`Servicio ${service.name} DISPONIBLE en ${service.url}`);
      } catch (error) {
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

  // ==================== MÉTODOS PÚBLICOS ====================

  /**
   * Obtiene información completa de un servicio
   */
  getServiceInfo(serviceName: string): ServiceInfo | undefined {
    const service = this.services.get(serviceName);
    if (!service) {
      this.logger.warn(`Servicio ${serviceName} no encontrado en el registro`);
    }
    return service;
  }

  /**
   * Obtiene solo la URL de un servicio
   */
  getServiceUrlByName(serviceName: string): string {
    const service = this.services.get(serviceName);
    const url = service?.url || 'http://localhost:3100';
    this.logger.log(`URL obtenida para ${serviceName}: ${url}`);
    return url;
  }

  /**
   * Verifica si un servicio específico está disponible
   */
  isServiceAvailable(serviceName: string): boolean {
    const service = this.services.get(serviceName);
    const available = service?.available || false;
    this.logger.log(`Disponibilidad de ${serviceName}: ${available ? 'DISPONIBLE' : 'NO DISPONIBLE'}`);
    return available;
  }

  /**
   * Obtiene todos los servicios registrados
   */
  getAllServices(): ServiceInfo[] {
    const allServices = Array.from(this.services.values());
    this.logger.log(`Total de servicios registrados: ${allServices.length}`);
    return allServices;
  }

  /**
   * Obtiene solo los servicios disponibles
   */
  getAvailableServices(): ServiceInfo[] {
    const availableServices = Array.from(this.services.values()).filter(s => s.available);
    this.logger.log(`Servicios disponibles: ${availableServices.length}`);
    return availableServices;
  }

  /**
   * Registra manualmente un servicio (para dinámicos)
   */
  registerService(serviceName: string, url: string, port: number) {
    this.services.set(serviceName, {
      name: serviceName,
      url,
      port,
      host: new URL(url).hostname,
      available: true,
    });
    this.logger.log(`Servicio ${serviceName} REGISTRADO manualmente en ${url}:${port}`);
  }

  /**
   * Refresca la disponibilidad de todos los servicios
   */
  async refreshServices() {
    this.logger.log('Refrescando disponibilidad de servicios...');
    await this.checkServicesAvailability();
  }

  /**
   * Indica si estamos en modo "todos los servicios juntos"
   */
  isAllServicesModeEnabled(): boolean {
    return this.isAllServicesMode;
  }

  /**
   * Obtiene el modo de ejecución actual
   */
  getRunMode(): string {
    const mode = this.isAllServicesMode ? 'all' : 'single';
    this.logger.log(`Modo de ejecución actual: ${mode}`);
    return mode;
  }

  /**
   * Obtiene servicios por tipo (disponibles, no disponibles, todos)
   */
  getServicesByStatus(status: 'available' | 'unavailable' | 'all'): ServiceInfo[] {
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

  /**
   * Encuentra un servicio por su puerto
   */
  getServiceByPort(port: number): ServiceInfo | undefined {
    const service = Array.from(this.services.values()).find(s => s.port === port);
    if (service) {
      this.logger.log(`Servicio encontrado por puerto ${port}: ${service.name}`);
    }
    return service;
  }
}
