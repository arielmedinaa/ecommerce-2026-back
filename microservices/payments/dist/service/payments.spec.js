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
var PaymentsValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsValidationService = void 0;
const common_1 = require("@nestjs/common");
const payment_error_service_1 = require("./errors/payment-error.service");
let PaymentsValidationService = PaymentsValidationService_1 = class PaymentsValidationService {
    constructor(paymentErrorService) {
        this.paymentErrorService = paymentErrorService;
        this.logger = new common_1.Logger(PaymentsValidationService_1.name);
    }
    async validatePaymentPayload(codigoCarrito, carrito, metodoPago, monto, moneda, cliente, descripcion) {
        if (!codigoCarrito || codigoCarrito <= 0) {
            const error = new Error('Código de carrito inválido');
            await this.paymentErrorService.logMicroserviceError(error, codigoCarrito?.toString(), 'validatePaymentPayload', {
                motivo: 'codigo_carrito_invalido',
                codigoCarrito,
            });
            this.logger.error('Error al validar código de carrito', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'Código de carrito no válido - debe ser mayor a 0',
                    data: [],
                },
            };
        }
        if (!carrito) {
            const error = new Error('Carrito es null o undefined');
            await this.paymentErrorService.logMicroserviceError(error, codigoCarrito?.toString(), 'validatePaymentPayload', {
                motivo: 'carrito_null',
                carrito,
                codigoCarrito,
            });
            this.logger.error('Error al validar el carrito', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'Carrito no válido - el carrito es requerido',
                    data: [],
                },
            };
        }
        const metodosPagoValidos = ['pagopar', 'bancard', 'efectivo contra entrega', 'tarjeta contra entrega'];
        if (!metodoPago || !metodosPagoValidos.includes(metodoPago)) {
            const error = new Error('Método de pago inválido');
            await this.paymentErrorService.logMicroserviceError(error, codigoCarrito?.toString(), 'validatePaymentPayload', {
                motivo: 'metodo_pago_invalido',
                metodoPago,
                metodosValidos: metodosPagoValidos,
                codigoCarrito,
            });
            this.logger.error('Error al validar método de pago', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'Método de pago no válido - debe ser: ' + metodosPagoValidos.join(', '),
                    data: [],
                },
            };
        }
        if (!monto || monto <= 0) {
            const error = new Error('Monto inválido');
            await this.paymentErrorService.logMicroserviceError(error, codigoCarrito?.toString(), 'validatePaymentPayload', {
                motivo: 'monto_invalido',
                monto,
                codigoCarrito,
            });
            this.logger.error('Error al validar monto', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'Monto no válido - debe ser mayor a 0',
                    data: [],
                },
            };
        }
        if (!moneda || moneda.trim() === '') {
            const error = new Error('Moneda inválida');
            await this.paymentErrorService.logMicroserviceError(error, codigoCarrito?.toString(), 'validatePaymentPayload', {
                motivo: 'moneda_invalida',
                moneda,
                codigoCarrito,
            });
            this.logger.error('Error al validar moneda', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'Moneda no válida - es requerida',
                    data: [],
                },
            };
        }
        return { isValid: true };
    }
    async validatePaymentUpdate(idTransaccion, estado) {
        if (!idTransaccion || idTransaccion.trim() === '') {
            const error = new Error('ID de transacción inválido');
            await this.paymentErrorService.logMicroserviceError(error, idTransaccion, 'validatePaymentUpdate', {
                motivo: 'id_transaccion_invalido',
                idTransaccion,
            });
            this.logger.error('Error al validar ID de transacción', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'ID de transacción no válido - es requerido',
                    data: [],
                },
            };
        }
        const estadosValidos = ['pendiente', 'procesando', 'completado', 'fallido', 'cancelado', 'reembolsado'];
        if (!estado || !estadosValidos.includes(estado)) {
            const error = new Error('Estado de pago inválido');
            await this.paymentErrorService.logMicroserviceError(error, idTransaccion, 'validatePaymentUpdate', {
                motivo: 'estado_invalido',
                estado,
                estadosValidos: estadosValidos,
                idTransaccion,
            });
            this.logger.error('Error al validar estado de pago', error);
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'Estado no válido - debe ser: ' + estadosValidos.join(', '),
                    data: [],
                },
            };
        }
        return { isValid: true };
    }
};
exports.PaymentsValidationService = PaymentsValidationService;
exports.PaymentsValidationService = PaymentsValidationService = PaymentsValidationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payment_error_service_1.PaymentErrorService])
], PaymentsValidationService);
//# sourceMappingURL=payments.spec.js.map