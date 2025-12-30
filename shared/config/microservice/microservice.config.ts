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
  AUTH: 3001,
  CART: 3002,
  CONTENT: 3003,
  ORDERS: 3004,
  PAYMENTS: 3005,
  PRODUCTS: 3006,
};
