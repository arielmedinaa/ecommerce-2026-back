import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceDiscoveryService } from '@shared/common/services/service-discovery.service';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly serviceDiscovery: ServiceDiscoveryService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Realiza comunicación TCP con un microservicio
   * Prioridad: TCP -> HTTP fallback
   */
  async communicateWithService(
    serviceName: string,
    pattern: any,
    data: any,
    clientProxy?: any,
  ): Promise<any> {
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
    } catch (tcpError) {
      this.logger.warn(`Error en comunicación TCP con ${serviceName}: ${tcpError.message}`);
      return this.communicateViaHttp(serviceName, pattern, data, tcpError);
    }
  }

  /**
   * Comunicación HTTP como fallback
   */
  private async communicateViaHttp(
    serviceName: string,
    pattern: any,
    data: any,
    originalError?: Error,
  ): Promise<any> {
    try {
      const serviceUrl = this.serviceDiscovery.getServiceUrlByName(serviceName);
      const axios = require('axios');
      
      const httpEndpoint = this.buildHttpEndpoint(pattern);
      const fullUrl = `${serviceUrl}${httpEndpoint}`;
      
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
      
    } catch (httpError) {
      this.logger.error(`Error CRÍTICO: Falló TCP y HTTP con ${serviceName}`);
      this.logger.error(`Error TCP: ${originalError?.message}`);
      this.logger.error(`Error HTTP: ${httpError.message}`);
      
      throw new Error(
        `No se pudo comunicar con ${serviceName}. ` +
        `TCP falló: ${originalError?.message}. ` +
        `HTTP falló: ${httpError.message}`
      );
    }
  }

  /**
   * Construye endpoint HTTP basado en el patrón TCP
   */
  private buildHttpEndpoint(pattern: any): string {
    const patternMap: { [key: string]: string } = {
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

  /**
   * Verifica disponibilidad antes de comunicar
   */
  async checkServiceBeforeCommunication(serviceName: string): Promise<boolean> {
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

  /**
   * Método genérico para comunicación con reintentos
   */
  async communicateWithRetry(
    serviceName: string,
    pattern: any,
    data: any,
    clientProxy?: any,
    maxRetries: number = 3,
  ): Promise<any> {
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
        
      } catch (error) {
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

  /**
   * Obtiene estadísticas de comunicación
   */
  getCommunicationStats(): any {
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
}
