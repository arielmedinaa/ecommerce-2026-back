import { ServiceDiscoveryService } from '@shared/common/services/service-discovery.service';
import { CommunicationService } from '@shared/common/services/communication.service';
export declare class HealthController {
    private readonly serviceDiscovery;
    private readonly communicationService;
    private readonly logger;
    constructor(serviceDiscovery: ServiceDiscoveryService, communicationService: CommunicationService);
    getHealth(): {
        status: string;
        service: string;
        port: number;
        timestamp: string;
        mode: any;
        message: string;
    };
    getDetailedHealth(): {
        status: string;
        service: string;
        port: number;
        timestamp: string;
        mode: any;
        uptime: number;
        memory: NodeJS.MemoryUsage;
        version: string;
        environment: string;
        message: string;
    };
    getServices(): {
        message: string;
        services: any;
        stats: any;
        timestamp: string;
    };
    checkService(serviceName: string): Promise<{
        status: string;
        message: string;
        timestamp: string;
        service?: undefined;
    } | {
        status: string;
        service: any;
        timestamp: string;
        message: string;
    }>;
    refreshServices(): Promise<{
        status: string;
        message: string;
        timestamp: string;
        services: any;
        error?: undefined;
    } | {
        status: string;
        message: string;
        error: any;
        timestamp: string;
        services?: undefined;
    }>;
    testCommunication(serviceName: string, pattern?: any, data?: any): Promise<{
        status: string;
        message: string;
        service: string;
        pattern: any;
        data: any;
        result: any;
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        message: string;
        service: string;
        pattern: any;
        data: any;
        error: any;
        timestamp: string;
        result?: undefined;
    }>;
}
