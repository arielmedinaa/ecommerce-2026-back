import { Transport } from '@nestjs/microservices';

export const getMicroserviceConfig = (serviceName: string, port: number) => ({
  transport: Transport.TCP,
  options: {
    host: '0.0.0.0',
    port,
  },
  name: serviceName.toUpperCase(),
});

export const SERVICE_PORTS = {
  AUTH: 3101,
  CART: 3102,
  CONTENT: 3103,
  ORDERS: 3104,
  PAYMENTS: 3105,
  PRODUCTS: 3106,
  IMAGE: 3107,
};
