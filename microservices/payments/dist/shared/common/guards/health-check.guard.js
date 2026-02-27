"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HealthCheckGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckGuard = void 0;
const common_1 = require("@nestjs/common");
let HealthCheckGuard = HealthCheckGuard_1 = class HealthCheckGuard {
    constructor() {
        this.logger = new common_1.Logger(HealthCheckGuard_1.name);
        this.serviceHealth = new Map();
        this.FAILURE_THRESHOLD = 5;
        this.RECOVERY_TIMEOUT = 30000;
    }
    canActivate(context) {
        const isRpc = context.getType() === 'rpc';
        if (isRpc) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        if (!request) {
            return true;
        }
        const { path, method } = request;
        if (path && (path.includes('/health') || path.includes('/status'))) {
            return true;
        }
        if (path && method && this.isCriticalEndpoint(path, method)) {
            return this.checkServiceHealth(path);
        }
        return true;
    }
    isCriticalEndpoint(path, method) {
        const criticalPatterns = [
            { path: '/home', methods: ['GET'] },
            { path: '/products', methods: ['GET'] },
            { path: '/cart', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
            { path: '/orders', methods: ['GET', 'POST'] },
        ];
        return criticalPatterns.some(pattern => path.includes(pattern.path) && pattern.methods.includes(method));
    }
    checkServiceHealth(path) {
        const serviceName = this.extractServiceName(path);
        const health = this.serviceHealth.get(serviceName);
        if (!health) {
            this.serviceHealth.set(serviceName, {
                status: 'UP',
                lastCheck: Date.now(),
                failures: 0,
            });
            return true;
        }
        const now = Date.now();
        const timeSinceLastCheck = now - health.lastCheck;
        if (health.status === 'DOWN') {
            if (timeSinceLastCheck >= this.RECOVERY_TIMEOUT) {
                this.logger.log(`Attempting to recover service: ${serviceName}`);
                this.serviceHealth.set(serviceName, {
                    status: 'UP',
                    lastCheck: now,
                    failures: 0,
                });
                return true;
            }
            else {
                this.logger.warn(`Service ${serviceName} is still DOWN`);
                return false;
            }
        }
        return true;
    }
    extractServiceName(path) {
        if (path.includes('/home'))
            return 'content';
        if (path.includes('/products'))
            return 'products';
        if (path.includes('/cart'))
            return 'cart';
        if (path.includes('/orders'))
            return 'orders';
        if (path.includes('/payments'))
            return 'payments';
        if (path.includes('/auth'))
            return 'auth';
        return 'unknown';
    }
    reportServiceFailure(serviceName) {
        const health = this.serviceHealth.get(serviceName) || {
            status: 'UP',
            lastCheck: Date.now(),
            failures: 0,
        };
        health.failures += 1;
        health.lastCheck = Date.now();
        if (health.failures >= this.FAILURE_THRESHOLD) {
            health.status = 'DOWN';
            this.logger.error(`Service ${serviceName} marked as DOWN after ${health.failures} failures`);
        }
        this.serviceHealth.set(serviceName, health);
    }
    reportServiceSuccess(serviceName) {
        const health = this.serviceHealth.get(serviceName);
        if (health) {
            health.status = 'UP';
            health.failures = 0;
            health.lastCheck = Date.now();
            this.serviceHealth.set(serviceName, health);
        }
    }
    getServiceHealth() {
        const health = {};
        for (const [service, status] of this.serviceHealth.entries()) {
            health[service] = status;
        }
        return health;
    }
    resetServiceHealth(serviceName) {
        this.serviceHealth.delete(serviceName);
        this.logger.log(`Reset health status for service: ${serviceName}`);
    }
};
exports.HealthCheckGuard = HealthCheckGuard;
exports.HealthCheckGuard = HealthCheckGuard = HealthCheckGuard_1 = __decorate([
    (0, common_1.Injectable)()
], HealthCheckGuard);
//# sourceMappingURL=health-check.guard.js.map