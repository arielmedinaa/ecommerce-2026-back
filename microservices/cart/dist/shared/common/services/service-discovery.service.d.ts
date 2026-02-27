import { ConfigService } from '@nestjs/config';
export interface ServiceInfo {
    name: string;
    url: string;
    port: number;
    host: string;
    available: boolean;
}
export declare class ServiceDiscoveryService {
    private readonly configService;
    private readonly logger;
    private services;
    private isAllServicesMode;
    constructor(configService: ConfigService);
    private initializeServices;
    private getServiceUrl;
    getServicePort(serviceName: string): number;
    private getServiceHost;
    private checkServicesAvailability;
    getServiceInfo(serviceName: string): ServiceInfo | undefined;
    getServiceUrlByName(serviceName: string): string;
    isServiceAvailable(serviceName: string): boolean;
    getAllServices(): ServiceInfo[];
    getAvailableServices(): ServiceInfo[];
    registerService(serviceName: string, url: string, port: number): void;
    refreshServices(): Promise<void>;
    isAllServicesModeEnabled(): boolean;
    getRunMode(): string;
    getServicesByStatus(status: 'available' | 'unavailable' | 'all'): ServiceInfo[];
    getServiceByPort(port: number): ServiceInfo | undefined;
}
