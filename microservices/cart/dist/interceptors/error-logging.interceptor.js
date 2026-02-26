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
var ErrorLoggingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorLoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const cart_error_service_1 = require("../service/errors/cart-error.service");
let ErrorLoggingInterceptor = ErrorLoggingInterceptor_1 = class ErrorLoggingInterceptor {
    constructor(cartErrorService) {
        this.cartErrorService = cartErrorService;
        this.logger = new common_1.Logger(ErrorLoggingInterceptor_1.name);
    }
    intercept(context, next) {
        const handler = context.getHandler();
        const className = context.getClass().name;
        const methodName = handler.name;
        const args = context.getArgs();
        const payload = args[0];
        let pattern = 'unknown';
        try {
            const reflectMetadata = Reflect.getMetadata('__pattern__', handler);
            if (reflectMetadata) {
                pattern = reflectMetadata.cmd || JSON.stringify(reflectMetadata);
            }
        }
        catch {
            pattern = methodName;
        }
        return next.handle().pipe((0, operators_1.catchError)(async (error) => {
            const cartId = payload?.codigo || payload?.cartId || 'unknown';
            const operation = `${className}.${methodName}`;
            await this.cartErrorService.logMicroserviceError(error, cartId, operation, {
                payload: payload,
                pattern: pattern,
                className: className,
                methodName: methodName,
            });
            this.logger.error(`Error in ${operation}: ${error.message}`, error.stack);
            return (0, rxjs_1.throwError)(() => error);
        }));
    }
};
exports.ErrorLoggingInterceptor = ErrorLoggingInterceptor;
exports.ErrorLoggingInterceptor = ErrorLoggingInterceptor = ErrorLoggingInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cart_error_service_1.CartErrorService])
], ErrorLoggingInterceptor);
//# sourceMappingURL=error-logging.interceptor.js.map