# Service Discovery y Comunicación entre Microservicios

## 🎯 **Propósito**

Este sistema permite que los microservicios se comuniquen entre sí, soportando dos modos de operación:

1. **Modo Individual (`RUN_MODE=single`)**: Cada desarrollador trabaja en un servicio
2. **Modo Completo (`RUN_MODE=all`)**: Todos los servicios corren juntos (Docker Compose)

## 🏗️ **Arquitectura**

### **1. ServiceDiscoveryService**
- **Registro central** de todos los microservicios
- **Detección automática** de disponibilidad
- **Configuración dinámica** según modo de ejecución

### **2. CommunicationService**
- **Comunicación TCP** prioritaria (ClientProxy)
- **Fallback HTTP** automático si TCP falla
- **Reintentos inteligentes** con backoff exponencial

### **3. HealthController**
- **Endpoint `/health`** para monitoreo
- **Endpoint `/services`** para descubrimiento
- **Endpoint `/test-communication`** para pruebas

## 🚀 **Modos de Uso**

### **Modo Desarrollo Individual**
```bash
# .env.local
RUN_MODE=single
AUTH_SERVICE_URL=http://localhost:3101
PRODUCTS_SERVICE_URL=http://localhost:3106
IMAGE_SERVICE_URL=http://localhost:4093
```

**Ventajas:**
- ✅ Cada desarrollador trabaja en su servicio
- ✅ Sin dependencias de otros servicios
- ✅ URLs localhost predecibles

### **Modo Todos Juntos (Admin)**
```bash
# .env.docker
RUN_MODE=all
IS_DOCKER=true
```

**Ventajas:**
- ✅ Comunicación TCP directa
- ✅ Un solo comando para iniciar todo
- ✅ Ideal para pruebas de integración

## 📡 **Flujo de Comunicación**

```typescript
// 1. Verificar disponibilidad
await communicationService.checkServiceBeforeCommunication('PRODUCTS_SERVICE');

// 2. Intentar TCP primero
const result = await communicationService.communicateWithRetry(
  'PRODUCTS_SERVICE',
  { cmd: 'get_products' },
  { limit: 10 },
  productsClient // ClientProxy inyectado
);

// 3. Fallback automático a HTTP si TCP falla
```

## 🔧 **Configuración por Servicio**

### **Para agregar a un servicio existente:**

```typescript
// En el module.ts del servicio
import { ServiceDiscoveryModule } from '@shared/config/microservice/microservice.module';
import { ServiceDiscoveryService } from '@shared/common/services/service-discovery.service';
import { CommunicationService } from '@shared/common/services/communication.service';
import { HealthController } from '@shared/common/controllers/health.controller';

@Module({
  imports: [ServiceDiscoveryModule],
  controllers: [HealthController],
  providers: [ServiceDiscoveryService, CommunicationService],
})
export class YourServiceModule {}
```

### **Para usar en un service:**

```typescript
@Injectable()
export class YourService {
  constructor(
    private readonly communicationService: CommunicationService,
    private readonly serviceDiscovery: ServiceDiscoveryService,
  ) {}

  async getProducts() {
    return this.communicationService.communicateWithRetry(
      'PRODUCTS_SERVICE',
      { cmd: 'get_products' },
      { category: 'electronics' },
      this.productsClient,
    );
  }

  async checkImageService() {
    const isAvailable = this.serviceDiscovery.isServiceAvailable('IMAGE_SERVICE');
    if (isAvailable) {
      // Comunicarse con image service
    }
  }
}
```

## 📊 **Endpoints de Health**

### **Health Check Básico**
```bash
GET /health
```
Respuesta:
```json
{
  "status": "ok",
  "service": "PRODUCTS_SERVICE",
  "port": 3106,
  "timestamp": "2026-02-26T14:30:00.000Z",
  "mode": "single",
  "message": "Servicio PRODUCTS_SERVICE funcionando correctamente"
}
```

### **Descubrimiento de Servicios**
```bash
GET /services
```
Respuesta:
```json
{
  "message": "Lista de servicios registrados",
  "services": [...],
  "stats": {
    "total": 7,
    "available": 5,
    "unavailable": 2,
    "runMode": "single"
  },
  "timestamp": "2026-02-26T14:30:00.000Z"
}
```

### **Prueba de Comunicación**
```bash
POST /test-communication
{
  "serviceName": "PRODUCTS_SERVICE",
  "pattern": { "cmd": "get_products" },
  "data": { "limit": 5 }
}
```

## 🐛 **Troubleshooting**

### **Servicio no disponible:**
```bash
# Verificar logs
🔍 Verificando disponibilidad de PRODUCTS_SERVICE antes de comunicar...
❌ Servicio PRODUCTS_SERVICE no disponible, intentando refrescar...
✅ Servicio PRODUCTS_SERVICE disponible para comunicación
```

### **Error de comunicación:**
```bash
# Logs detallados
📡 Iniciando comunicación con PRODUCTS_SERVICE
🔗 Usando comunicación TCP con PRODUCTS_SERVICE
❌ Error en comunicación TCP con PRODUCTS_SERVICE: connect ECONNREFUSED
🌐 Fallback a HTTP con PRODUCTS_SERVICE
✅ Comunicación HTTP exitosa con PRODUCTS_SERVICE
```

## 🎉 **Beneficios**

1. **🔄 Transparencia**: Los servicios no necesitan saber si están en modo individual o completo
2. **🛡️ Resiliencia**: Fallback automático TCP -> HTTP
3. **📊 Observabilidad**: Logs detallados y endpoints de monitoreo
4. **🔧 Flexibilidad**: Soporta ambos modos de desarrollo
5. **🚀 Escalabilidad**: Fácil agregar nuevos servicios

## 📋 **Próximos Pasos**

1. **Integrar** en cada microservicio existente
2. **Configurar** variables de entorno en cada servicio
3. **Probar** comunicación entre servicios
4. **Documentar** patrones de comunicación específicos
