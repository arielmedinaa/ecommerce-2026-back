import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

export const SERVICE_PORTS = {
  AUTH_SERVICE: 3101,
  CART_SERVICE: 3102,
  CONTENT_SERVICE: 3103,
  ORDERS_SERVICE: 3104,
  PAYMENTS_SERVICE: 3105,
  PRODUCTS_SERVICE: 3106,
} as const;

type ServiceName = keyof typeof SERVICE_PORTS;

export const getMicroserviceConfig = (serviceName: string) => {
  const service = serviceName.toUpperCase() as ServiceName;
  const port = process.env[`${service}_PORT`] || 
              process.env.PORT || 
              SERVICE_PORTS[service] || 
              3000;

  const host = process.env.IS_DOCKER
    ? serviceName.replace('_SERVICE', '').toLowerCase()
    : 'localhost';
  
  console.log(`Configuring ${service} microservice at ${host}:${port}`);
  
  return {
    transport: Transport.TCP,
    options: {
      host: host,
      port: SERVICE_PORTS[service],
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
