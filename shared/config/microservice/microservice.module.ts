import { DynamicModule, Module, Provider } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { createResilientClient } from '@shared/common/microservices/resilient-client.factory';

export const SERVICE_PORTS = {
  AUTH_SERVICE: 3101,
  CART_SERVICE: 3102,
  CONTENT_SERVICE: 3103,
  ORDERS_SERVICE: 3104,
  PAYMENTS_SERVICE: 3105,
  PRODUCTS_SERVICE: 3106,
  IMAGE_SERVICE: 3107,
  MAIL_SERVICE: 3108,
  ETL_SERVICE: 3109,
} as const;

const getNatsServers = (): string[] => [
  process.env.NATS_URL || 'nats://nats:4222',
];

export const getMicroserviceConfig = (_serviceName: string) => ({
  transport: Transport.NATS,
  options: { servers: getNatsServers() },
});

function buildClientProvider(serviceName: string): Provider {
  return {
    provide: serviceName,
    useFactory: () =>
      createResilientClient(
        {
          transport: Transport.NATS,
          options: { servers: getNatsServers() },
        },
        serviceName,
      ),
  };
}

@Module({})
export class MicroserviceModule {
  static register(serviceName: string): DynamicModule {
    return {
      module: MicroserviceModule,
      providers: [buildClientProvider(serviceName)],
      exports: [serviceName],
    };
  }

  static forRoot(services: string[]): DynamicModule {
    return {
      module: MicroserviceModule,
      providers: services.map(buildClientProvider),
      exports: services,
    };
  }
}
