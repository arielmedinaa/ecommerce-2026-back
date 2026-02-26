import { Injectable, Logger } from '@nestjs/common';
import { ServiceDiscoveryService } from '@shared/common/services/service-discovery.service';
import { CommunicationService } from '@shared/common/services/communication.service';

/**
 * Controlador para health checks y descubrimiento de servicios
 */
@Injectable()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly serviceDiscovery: ServiceDiscoveryService,
    private readonly communicationService: CommunicationService,
  ) {
    this.logger.log('Health Controller inicializado');
  }

  /**
   * Endpoint básico de health check
   */
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

  /**
   * Endpoint detallado con información del servicio
   */
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

  /**
   * Endpoint para descubrimiento de servicios
   */
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

  /**
   * Endpoint para verificar disponibilidad de un servicio específico
   */
  async checkService(serviceName: string) {
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

  /**
   * Endpoint para refrescar descubrimiento de servicios
   */
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
    } catch (error) {
      this.logger.error(`❌ Error refrescando servicios: ${error.message}`);
      
      return {
        status: 'error',
        message: 'Error refrescando servicios',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Endpoint de prueba de comunicación entre servicios
   */
  async testCommunication(serviceName: string, pattern: any = { cmd: 'ping' }, data: any = { test: true }) {
    this.logger.log(`🧪 Prueba de comunicación solicitada con ${serviceName}`);
    
    try {
      const result = await this.communicationService.communicateWithRetry(
        serviceName,
        pattern,
        data,
        null, // Sin ClientProxy para prueba HTTP
        2, // 2 reintentos
      );
      
      return {
        status: 'success',
        message: `Comunicación exitosa con ${serviceName}`,
        service: serviceName,
        pattern: pattern,
        data: data,
        result: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
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
}
