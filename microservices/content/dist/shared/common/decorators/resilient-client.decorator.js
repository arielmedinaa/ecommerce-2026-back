"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ResilientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilientService = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const circuit_breaker_decorator_1 = require("./circuit-breaker.decorator");
let ResilientService = ResilientService_1 = class ResilientService {
    constructor() {
        this.logger = new common_1.Logger(ResilientService_1.name);
        this.circuitBreakers = new Map();
    }
    async sendWithResilience(client, pattern, data, options = {}) {
        const { retries = 3, delay: retryDelay = 1000, fallback, circuitBreaker: cbOptions = {}, } = options;
        const serviceKey = pattern.cmd || JSON.stringify(pattern);
        if (!this.circuitBreakers.has(serviceKey)) {
            this.circuitBreakers.set(serviceKey, new circuit_breaker_decorator_1.CircuitBreaker({
                failureThreshold: cbOptions.failureThreshold || 5,
                resetTimeout: cbOptions.resetTimeout || 30000,
            }));
        }
        const circuitBreaker = this.circuitBreakers.get(serviceKey);
        return circuitBreaker.execute(async () => {
            return this.executeWithRetry(client, pattern, data, retries, retryDelay);
        }, fallback);
    }
    async executeWithRetry(client, pattern, data, retries, delay) {
        try {
            const response = client.send(pattern, data);
            const result = await (0, rxjs_1.firstValueFrom)(response);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to execute command ${pattern.cmd} after ${retries} retries:`, error.message);
            this.logger.error(`Full error details:`, error.stack || error);
            throw error;
        }
    }
    createRetryObservable(observable, retries, retryDelay) {
        if (retries <= 0)
            return observable;
        return observable.pipe((0, operators_1.retryWhen)((errors) => errors.pipe((0, operators_1.delay)(retryDelay), (0, operators_1.take)(retries), (0, operators_1.mergeMap)((error, index) => {
            this.logger.warn(`Retry attempt ${index + 1}/${retries} for error: ${error.message}`);
            return (0, rxjs_1.throwError)(() => error);
        }))));
    }
    getCircuitBreakerStates() {
        const states = {};
        for (const [key, breaker] of this.circuitBreakers.entries()) {
            states[key] = breaker.getState();
        }
        return states;
    }
    resetCircuitBreaker(serviceKey) {
        const breaker = this.circuitBreakers.get(serviceKey);
        if (breaker) {
            this.circuitBreakers.delete(serviceKey);
            this.logger.log(`Circuit breaker reset for service: ${serviceKey}`);
        }
    }
};
exports.ResilientService = ResilientService;
exports.ResilientService = ResilientService = ResilientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ResilientService);
//# sourceMappingURL=resilient-client.decorator.js.map