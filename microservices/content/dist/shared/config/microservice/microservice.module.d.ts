import { DynamicModule } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
export declare const SERVICE_PORTS: {
    readonly AUTH_SERVICE: 3101;
    readonly CART_SERVICE: 3102;
    readonly CONTENT_SERVICE: 3103;
    readonly ORDERS_SERVICE: 3104;
    readonly PAYMENTS_SERVICE: 3105;
    readonly PRODUCTS_SERVICE: 3106;
    readonly IMAGE_SERVICE: 3107;
};
export declare const getMicroserviceConfig: (serviceName: string) => {
    transport: Transport;
    options: {
        host: string;
        port: number;
    };
};
export declare class MicroserviceModule {
    static register(serviceName: string): DynamicModule;
    static forRoot(services: string[]): DynamicModule;
}
