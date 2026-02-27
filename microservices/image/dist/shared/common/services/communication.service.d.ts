import { ConfigService } from '@nestjs/config';
import { ServiceDiscoveryService } from '@shared/common/services/service-discovery.service';
export declare class CommunicationService {
    private readonly serviceDiscovery;
    private readonly configService;
    private readonly logger;
    constructor(serviceDiscovery: ServiceDiscoveryService, configService: ConfigService);
    communicateWithService(serviceName: string, pattern: any, data: any, clientProxy?: any): Promise<any>;
    private communicateViaHttp;
    private buildHttpEndpoint;
    checkServiceBeforeCommunication(serviceName: string): Promise<boolean>;
    communicateWithRetry(serviceName: string, pattern: any, data: any, clientProxy?: any, maxRetries?: number): Promise<any>;
    getCommunicationStats(): any;
}
