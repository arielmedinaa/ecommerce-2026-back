import { Transport } from '@nestjs/microservices';
export declare const getMicroserviceConfig: (serviceName: string, port: number) => {
    transport: Transport;
    options: {
        host: string;
        port: number;
    };
    name: string;
};
export declare const SERVICE_PORTS: {
    AUTH: number;
    CART: number;
    CONTENT: number;
    ORDERS: number;
    PAYMENTS: number;
    PRODUCTS: number;
    IMAGE: number;
};
