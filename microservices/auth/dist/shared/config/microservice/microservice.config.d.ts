export declare const getMicroserviceConfig: (serviceName: string, port: number) => {
    transport: any;
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
export declare const getNatsServers: () => string[];
export declare const getNatsServerOptions: (serviceName: string) => {
    transport: any;
    options: {
        servers: string[];
        queue: string;
    };
};
