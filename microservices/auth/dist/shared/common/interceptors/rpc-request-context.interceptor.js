"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcRequestContextInterceptor = void 0;
const common_1 = require("@nestjs/common");
const request_context_1 = require("../logging/request-context");
let RpcRequestContextInterceptor = class RpcRequestContextInterceptor {
    intercept(context, next) {
        if (context.getType() !== 'rpc')
            return next.handle();
        const data = context.switchToRpc().getData();
        const requestId = data?.headers?.['x-request-id'] ||
            data?.headers?.['x-correlation-id'] ||
            data?.requestId;
        const userId = data?.userId;
        return request_context_1.RequestContext.run({
            requestId: requestId ? String(requestId) : undefined,
            userId: userId ? String(userId) : undefined,
        }, () => next.handle());
    }
};
exports.RpcRequestContextInterceptor = RpcRequestContextInterceptor;
exports.RpcRequestContextInterceptor = RpcRequestContextInterceptor = __decorate([
    (0, common_1.Injectable)()
], RpcRequestContextInterceptor);
//# sourceMappingURL=rpc-request-context.interceptor.js.map