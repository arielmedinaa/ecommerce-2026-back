import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

export const SERVICE_PORTS = {
  AUTH_SERVICE: 3101,
  CART_SERVICE: 3102,
  CONTENT_SERVICE: 3103,
  ORDERS_SERVICE: 3104,
  PAYMENTS_SERVICE: 3105,
  PRODUCTS_SERVICE: 3106,
  IMAGE_SERVICE: 3107,
} as const;

const getNatsServers = (): string[] => [
  process.env.NATS_URL || 'nats://nats:4222',
];

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
        ClientsModule.register(clientModules as any), 
      ],
      exports: [ClientsModule],
    };
  }
}
