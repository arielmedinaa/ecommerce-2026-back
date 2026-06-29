import { Transport } from '@nestjs/microservices';

export const getMicroserviceConfig = (serviceName: string, port: number) => ({
  transport: Transport.TCP,
  options: {
    host: '0.0.0.0',
    port,
  },
  name: serviceName.toUpperCase(),
});

// Puertos HTTP de cada servicio (health/swagger). Ya NO se usan para el transporte
// inter-servicio: ese ahora va por NATS (bus compartido), no por TCP host:port.
export const SERVICE_PORTS = {
  AUTH: 3101,
  CART: 3102,
  CONTENT: 3103,
  ORDERS: 3104,
  PAYMENTS: 3105,
  PRODUCTS: 3106,
  IMAGE: 3107,
};

/** Servidores NATS del bus de mensajería (default: el Service `nats` en k8s). */
export const getNatsServers = (): string[] => [
  process.env.NATS_URL || 'nats://nats:4222',
];

/**
 * Opciones del lado SERVIDOR para `app.connectMicroservice(...)`.
 *
 * El `queue` (queue group de NATS) hace que, cuando un servicio corre con N réplicas,
 * NATS reparta cada mensaje a UNA sola réplica del grupo → load balancing real entre
 * réplicas, que es justamente lo que el transporte TCP no daba.
 */
export const getNatsServerOptions = (serviceName: string) => ({
  transport: Transport.NATS as const,
  options: {
    servers: getNatsServers(),
    queue: `${serviceName.toUpperCase()}_QUEUE`,
  },
});
