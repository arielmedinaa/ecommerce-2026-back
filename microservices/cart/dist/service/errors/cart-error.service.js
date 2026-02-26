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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartErrorService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const cart_error_schema_1 = require("../../schemas/errors/cart.error.schema");
const moment_timezone_1 = require("moment-timezone");
let CartErrorService = class CartErrorService {
    constructor(cartErrorModel) {
        this.cartErrorModel = cartErrorModel;
    }
    async logError(cartId, errorCode, message, context, stackTrace, path) {
        try {
            const errorLog = new this.cartErrorModel({
                cartId,
                errorCode,
                message,
                context: {
                    ...context,
                    timestamp: (0, moment_timezone_1.default)().tz('America/Asuncion').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
                    service: 'cart-microservice',
                },
                stackTrace,
                path,
            });
            return await errorLog.save();
        }
        catch (logError) {
            console.error('Error al guardar log de error:', logError);
            return null;
        }
    }
    async logMicroserviceError(error, cartId, operation, additionalContext) {
        const errorCode = error.name || 'UNKNOWN_ERROR';
        const message = error.message || 'Error desconocido';
        return this.logError(cartId || 'unknown', errorCode, message, {
            operation,
            ...additionalContext,
            originalError: {
                name: error.name,
                message: error.message,
                code: error.code,
                status: error.status,
            },
        }, error.stack, error.path || operation);
    }
    async getErrorLogs(cartId, limit = 100) {
        const filter = cartId ? { cartId } : {};
        return this.cartErrorModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getErrorStats() {
        const stats = await this.cartErrorModel.aggregate([
            {
                $group: {
                    _id: '$errorCode',
                    count: { $sum: 1 },
                    lastOccurrence: { $max: '$createdAt' },
                },
            },
            { $sort: { count: -1 } },
        ]);
        return stats;
    }
};
exports.CartErrorService = CartErrorService;
exports.CartErrorService = CartErrorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(cart_error_schema_1.CartError.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], CartErrorService);
//# sourceMappingURL=cart-error.service.js.map