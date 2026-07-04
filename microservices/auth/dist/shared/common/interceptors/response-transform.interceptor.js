"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseTransformInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const response_data_1 = require("../response/response.data");
let ResponseTransformInterceptor = class ResponseTransformInterceptor {
    intercept(_context, next) {
        return next.handle().pipe((0, operators_1.map)((value) => {
            if (value instanceof response_data_1.ResponseData)
                return value;
            if (Buffer.isBuffer(value))
                return value;
            if (value === null || value === undefined) {
                return { success: true, message: '', data: null };
            }
            if (Array.isArray(value) || typeof value !== 'object') {
                return { success: true, message: '', data: value };
            }
            return { success: true, message: '', ...value };
        }));
    }
};
exports.ResponseTransformInterceptor = ResponseTransformInterceptor;
exports.ResponseTransformInterceptor = ResponseTransformInterceptor = __decorate([
    (0, common_1.Injectable)()
], ResponseTransformInterceptor);
//# sourceMappingURL=response-transform.interceptor.js.map