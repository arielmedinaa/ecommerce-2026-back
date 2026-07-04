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
var CircuitBreaker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
const common_1 = require("@nestjs/common");
let CircuitBreaker = CircuitBreaker_1 = class CircuitBreaker {
    constructor(options = {}) {
        this.options = options;
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.successCount = 0;
        this.logger = new common_1.Logger(CircuitBreaker_1.name);
        this.options = {
            failureThreshold: 5,
            resetTimeout: 60000,
            monitoringPeriod: 10000,
            ...options,
        };
    }
    async execute(fn, fallback) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
                this.state = 'HALF_OPEN';
                this.successCount = 0;
                this.logger.log('Circuit breaker transitioning to HALF_OPEN');
            }
            else {
                this.logger.warn('Circuit breaker is OPEN, using fallback');
                if (fallback)
                    return fallback();
                throw new Error('Circuit breaker is OPEN');
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            if (fallback)
                return fallback();
            throw error;
        }
    }
    onSuccess() {
        this.failureCount = 0;
        if (this.state === 'HALF_OPEN') {
            this.successCount++;
            if (this.successCount >= 3) {
                this.state = 'CLOSED';
                this.logger.log('Circuit breaker transitioning to CLOSED');
            }
        }
    }
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.options.failureThreshold) {
            this.state = 'OPEN';
            this.logger.error(`Circuit breaker transitioning to OPEN after ${this.failureCount} failures`);
        }
    }
    getState() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
        };
    }
};
exports.CircuitBreaker = CircuitBreaker;
exports.CircuitBreaker = CircuitBreaker = CircuitBreaker_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], CircuitBreaker);
//# sourceMappingURL=circuit-breaker.decorator.js.map