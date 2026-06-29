import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

// Conservado por compatibilidad; ya no se usa para descubrimiento (NATS es un bus
// compartido, no requiere host:port por servicio).
export const SERVICE_PORTS = {
  AUTH_SERVICE: 3101,
  CART_SERVICE: 3102,
  CONTENT_SERVICE: 3103,
  ORDERS_SERVICE: 3104,
  PAYMENTS_SERVICE: 3105,
  PRODUCTS_SERVICE: 3106,
  IMAGE_SERVICE: 3107,
} as const;

/** Servidores NATS del bus de mensajería (default: el Service `nats` en k8s). */
const getNatsServers = (): string[] => [
  process.env.NATS_URL || 'nats://nats:4222',
];

// Configuración del lado CLIENTE (ClientProxy). Todos los clientes publican al mismo
// bus NATS; el subject se deriva del pattern `{cmd}` y NATS lo entrega al queue group
// del servicio dueño. No lleva `queue` (eso es del lado servidor / subscriber).
export const getMicroserviceConfig = (_serviceName: string) => ({
  transport: Transport.NATS,
  options: { servers: getNatsServers() },
});

@Module({})
export class MicroserviceModule {
  static register(serviceName: string): DynamicModule {
    return {
      module: MicroserviceModule,
      imports: [
        ClientsModule.register([
          {
            name: serviceName,
            transport: Transport.NATS,
            options: { servers: getNatsServers() },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }

  static forRoot(services: string[]): DynamicModule {
    const clientModules = services.map((serviceName) => ({
      name: serviceName,
      transport: Transport.NATS,
      options: { servers: getNatsServers() },
    }));

    return {
      module: MicroserviceModule,
      imports: [
        ClientsModule.register(clientModules as any), // Temporary type assertion
      ],
      exports: [ClientsModule],
    };
  }
}
