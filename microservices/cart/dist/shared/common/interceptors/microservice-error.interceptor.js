"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MicroserviceErrorInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicroserviceErrorInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
let MicroserviceErrorInterceptor = MicroserviceErrorInterceptor_1 = class MicroserviceErrorInterceptor {
    constructor() {
        this.logger = new common_1.Logger(MicroserviceErrorInterceptor_1.name);
    }
    intercept(context, next) {
        const contextType = context.getType();
        if (contextType === 'rpc') {
            return this.handleRpcContext(context, next);
        }
        return this.handleHttpContext(context, next);
    }
    handleRpcContext(context, next) {
        const timestamp = new Date().toISOString();
        const pattern = 'RPC_CALL';
        this.logger.log(`Incoming RPC Call - ${timestamp}`);
        return next.handle().pipe((0, operators_1.catchError)((error) => {
            const errorMessage = error?.message || 'Unknown error';
            const errorStack = error?.stack || '';
            this.logger.error(`Error in RPC call: ${errorMessage}`, errorStack);
            this.logErrorDetails({
                method: 'RPC',
                url: pattern,
                ip: 'N/A',
                userAgent: 'N/A',
                timestamp,
                error: {
                    message: errorMessage,
                    stack: errorStack,
                    code: 500,
                    name: error?.name || 'Error',
                },
            });
            return (0, rxjs_1.throwError)(() => this.formatErrorResponse(error));
        }));
    }
    handleHttpContext(context, next) {
        const request = context.switchToHttp().getRequest();
        const { method, url, ip } = request;
        const userAgent = request.get('User-Agent') || '';
        const timestamp = new Date().toISOString();
        this.logger.log(`Incoming Request: ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`);
        return next.handle().pipe((0, operators_1.catchError)((error) => {
            const errorMessage = error?.message || 'Unknown error';
            const errorStack = error?.stack || '';
            const errorCode = error?.status || error?.statusCode || 500;
            this.logger.error(`Error in ${method} ${url}: ${errorMessage}`, errorStack);
            this.logErrorDetails({
                method,
                url,
                ip,
                userAgent,
                timestamp,
                error: {
                    message: errorMessage,
                    stack: errorStack,
                    code: errorCode,
                    name: error?.name || 'Error',
                },
            });
            return (0, rxjs_1.throwError)(() => this.formatErrorResponse(error));
        }));
    }
    formatErrorResponse(error) {
        const statusCode = error?.status || error?.statusCode || 500;
        const message = this.getUserFriendlyMessage(error);
        return {
            statusCode,
            message,
            timestamp: new Date().toISOString(),
            path: error?.path || '',
            ...(process.env.NODE_ENV === 'development' && {
                error: {
                    name: error?.name,
                    stack: error?.stack,
                    originalMessage: error?.message,
                },
            }),
        };
    }
    getUserFriendlyMessage(error) {
        const errorMappings = {
            'ECONNREFUSED': 'Service temporarily unavailable. Please try again later.',
            'ETIMEDOUT': 'Request timed out. Please try again.',
            'ENOTFOUND': 'Service not available. Please check your connection.',
            'Circuit breaker is OPEN': 'Service temporarily unavailable. Please try again later.',
            'MongoServerError': 'Database error. Please try again later.',
            'ValidationError': 'Invalid data provided.',
            'UnauthorizedError': 'Authentication required.',
            'ForbiddenError': 'Access denied.',
        };
        const errorName = error?.name || '';
        const errorMessage = error?.message || '';
        for (const [key, message] of Object.entries(errorMappings)) {
            if (errorMessage.includes(key) || errorName.includes(key)) {
                return message;
            }
        }
        return 'An error occurred. Please try again later.';
    }
    logErrorDetails(details) {
        this.logger.error('Error Details:', JSON.stringify(details, null, 2));
    }
};
exports.MicroserviceErrorInterceptor = MicroserviceErrorInterceptor;
exports.MicroserviceErrorInterceptor = MicroserviceErrorInterceptor = MicroserviceErrorInterceptor_1 = __decorate([
    (0, common_1.Injectable)()
], MicroserviceErrorInterceptor);
//# sourceMappingURL=microservice-error.interceptor.js.map