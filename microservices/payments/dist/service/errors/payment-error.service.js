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
exports.PaymentErrorService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const payment_error_schema_1 = require("../../schemas/errors/payment.error.schema");
const moment_timezone_1 = require("moment-timezone");
let PaymentErrorService = class PaymentErrorService {
    constructor(paymentErrorModel) {
        this.paymentErrorModel = paymentErrorModel;
    }
    async logError(paymentId, errorCode, message, context, stackTrace, path) {
        try {
            const errorLog = new this.paymentErrorModel({
                paymentId,
                errorCode,
                message,
                context: {
                    ...context,
                    timestamp: (0, moment_timezone_1.default)().tz('America/Asuncion').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
                    service: 'payments-microservice',
                },
                stackTrace,
                path,
            });
            return await errorLog.save();
        }
        catch (logError) {
            console.error('Error al guardar log de error de pago:', logError);
            return null;
        }
    }
    async logMicroserviceError(error, paymentId, operation, additionalContext) {
        const errorCode = error.name || 'UNKNOWN_ERROR';
        const message = error.message || 'Error desconocido';
        return this.logError(paymentId || 'unknown', errorCode, message, {
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
    async getErrorLogs(paymentId, limit = 100) {
        const filter = paymentId ? { paymentId } : {};
        return this.paymentErrorModel
            .find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec();
    }
    async getErrorStats() {
        const stats = await this.paymentErrorModel.aggregate([
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
    async getPaymentErrorHistory(paymentId) {
        return this.paymentErrorModel
            .find({ paymentId })
            .sort({ createdAt: -1 })
            .exec();
    }
    async logPaymentGatewayError(paymentId, gateway, gatewayResponse, error) {
        return this.logError(paymentId, 'GATEWAY_ERROR', `Error en pasarela de pago ${gateway}`, {
            gateway,
            gatewayResponse,
            error: {
                name: error.name,
                message: error.message,
                code: error.code,
            },
        }, error.stack, 'payment-gateway');
    }
    async logValidationError(paymentId, field, value, validationRule) {
        return this.logError(paymentId, 'VALIDATION_ERROR', `Error de validación en campo ${field}`, {
            field,
            value,
            validationRule,
        }, undefined, 'payment-validation');
    }
};
exports.PaymentErrorService = PaymentErrorService;
exports.PaymentErrorService = PaymentErrorService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(payment_error_schema_1.PaymentError.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], PaymentErrorService);
//# sourceMappingURL=payment-error.service.js.map