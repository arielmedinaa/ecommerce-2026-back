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

type ServiceName = keyof typeof SERVICE_PORTS;

const parsePort = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return;
  const str = String(value).trim();
  if (!str) return;
  if (/^\d+$/.test(str)) return Number(str);

  // Kubernetes injects env vars like AUTH_SERVICE_PORT=tcp://10.96.x.y:3101
  // Accept that format too.
  const match = str.match(/:(\d+)$/);
  if (match) return Number(match[1]);
};

export const getMicroserviceConfig = (serviceName: string) => {
  const service = serviceName.toUpperCase() as ServiceName;
  const serviceAlias = service.replace('_SERVICE', '');
  const port =
    parsePort(process.env[`${service}_PORT`]) ??
    parsePort(process.env[`${serviceAlias}_PORT`]) ??
    SERVICE_PORTS[service] ??
    parsePort(process.env.PORT) ??
    3000;

  const configuredHost =
    process.env[`${service}_URL`] ||
    process.env[`${serviceAlias}_SERVICE_URL`];
  const fallbackHost = process.env.IS_DOCKER
    ? `deploy-${serviceName.replace('_SERVICE', '').toLowerCase()}-1`
    : 'localhost';
  const host = configuredHost || fallbackHost;

  console.log(`Configuring ${service} microservice at ${host}:${port}`);

  return {
    transport: Transport.TCP,
    options: {
      host,
      port,
    },
  };
};

@Module({})
export class MicroserviceModule {
  static register(serviceName: string): DynamicModule {
    const config = getMicroserviceConfig(serviceName);
    
    return {
      module: MicroserviceModule,
      imports: [
        ClientsModule.register([
          {
            name: serviceName,
            transport: Transport.TCP,
            options: config.options,
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }

  static forRoot(services: string[]): DynamicModule {
    const clientModules = services.map(serviceName => {
      const config = getMicroserviceConfig(serviceName);
      return {
        name: serviceName,
        transport: Transport.TCP,
        options: {
          host: config.options.host,
          port: config.options.port,
        },
      };
    });

    return {
      module: MicroserviceModule,
      imports: [
        ClientsModule.register(clientModules as any), // Temporary type assertion
      ],
      exports: [ClientsModule],
    };
  }
}
