import { LoggerService } from '@nestjs/common';
type JsonLogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';
export type JsonLogRecord = {
    timestamp: string;
    level: JsonLogLevel;
    service?: string;
    context?: string;
    requestId?: string;
    userId?: string;
    message: any;
    meta?: Record<string, any>;
};
export declare class JsonLogger implements LoggerService {
    private readonly serviceName?;
    constructor(serviceName?: string);
    log(message: any, context?: string): void;
    error(message: any, stack?: string, context?: string): void;
    warn(message: any, context?: string): void;
    debug(message: any, context?: string): void;
    verbose(message: any, context?: string): void;
    private write;
}
export {};
