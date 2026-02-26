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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const payments_schema_1 = require("../schemas/payments.schema");
const moment_timezone_1 = require("moment-timezone");
const payment_error_service_1 = require("./errors/payment-error.service");
let PaymentsService = class PaymentsService {
    constructor(paymentsModel, paymentErrorService) {
        this.paymentsModel = paymentsModel;
        this.paymentErrorService = paymentErrorService;
    }
    async registrarPago(codigoCarrito, carrito, metodoPago, monto, moneda = 'PYG', cliente, descripcion, respuestaPagopar, respuestaBancard) {
        const idTransaccion = this.generarIdTransaccion();
        try {
            const nuevoPago = new this.paymentsModel({
                codigoCarrito,
                carrito,
                estado: 'pendiente',
                metodoPago,
                monto,
                moneda,
                idTransaccion,
                descripcion: descripcion || `Pago del carrito ${codigoCarrito}`,
                cliente: cliente || {},
                respuestaPagopar: respuestaPagopar || {},
                respuestaBancard: respuestaBancard || {},
                metadatos: {},
                procesado: new Date(),
                expira: this.calcularFechaExpiracion(metodoPago),
            });
            await nuevoPago.save();
            return {
                data: nuevoPago,
                success: true,
                message: 'PAGO REGISTRADO CON ÉXITO',
            };
        }
        catch (error) {
            this.paymentErrorService.logMicroserviceError(error, idTransaccion, 'registrarPago');
            return {
                data: null,
                success: false,
                message: `ERROR AL REGISTRAR PAGO: ${error.message}`,
            };
        }
    }
    async listarPagosPorCarrito(codigoCarrito) {
        try {
            const pagos = await this.paymentsModel
                .find({ codigoCarrito })
                .sort({ codigoCarrito: -1 })
                .lean();
            if (!pagos || pagos.length === 0) {
                return {
                    data: [],
                    success: false,
                    message: 'NO SE ENCONTRARON PAGOS PARA ESTE CARRITO',
                };
            }
            return {
                data: pagos,
                success: true,
                message: 'PAGOS RECUPERADOS CON ÉXITO',
            };
        }
        catch (error) {
            return {
                data: [],
                success: false,
                message: `ERROR AL LISTAR PAGOS: ${error.message}`,
            };
        }
    }
    async obtenerReembolsos(codigoCarrito) {
        try {
            const pagos = await this.paymentsModel
                .find({
                codigoCarrito,
                'reembolsos.0': { $exists: true },
            })
                .lean();
            if (!pagos || pagos.length === 0) {
                return {
                    data: [],
                    success: false,
                    message: 'NO SE ENCONTRARON REEMBOLSOS PARA ESTE CARRITO',
                };
            }
            const todosReembolsos = pagos.flatMap((pago) => pago.reembolsos || []);
            return {
                data: todosReembolsos,
                success: true,
                message: 'REEMBOLSOS RECUPERADOS CON ÉXITO',
            };
        }
        catch (error) {
            return {
                data: [],
                success: false,
                message: `ERROR AL OBTENER REEMBOLSOS: ${error.message}`,
            };
        }
    }
    async verMotivoRechazo(codigoCarrito) {
        try {
            const pagoRechazado = await this.paymentsModel
                .findOne({
                codigoCarrito,
                estado: 'fallido',
                motivoFallo: { $exists: true, $ne: null },
            })
                .sort({ createdAt: -1 })
                .lean();
            if (!pagoRechazado) {
                return {
                    data: null,
                    success: false,
                    message: 'NO SE ENCONTRARON PAGOS RECHAZADOS PARA ESTE CARRITO',
                };
            }
            return {
                data: {
                    idTransaccion: pagoRechazado.idTransaccion,
                    metodoPago: pagoRechazado.metodoPago,
                    monto: pagoRechazado.monto,
                    motivoFallo: pagoRechazado.motivoFallo,
                    fechaRechazo: pagoRechazado.createdAt,
                    intentosReintentar: pagoRechazado.intentosReintentar,
                },
                success: true,
                message: 'MOTIVO DE RECHAZO RECUPERADO CON ÉXITO',
            };
        }
        catch (error) {
            return {
                data: null,
                success: false,
                message: `ERROR AL OBTENER MOTIVO DE RECHAZO: ${error.message}`,
            };
        }
    }
    async actualizarEstadoPago(idTransaccion, estado, respuestaPagopar, respuestaBancard, motivoFallo) {
        try {
            const updateData = {
                estado,
            };
            if (estado === 'completado') {
                updateData.finalizado = (0, moment_timezone_1.default)().tz('America/Asuncion').toDate();
            }
            if (respuestaPagopar) {
                updateData.respuestaPagopar = respuestaPagopar;
            }
            if (respuestaBancard) {
                updateData.respuestaBancard = respuestaBancard;
            }
            if (motivoFallo) {
                updateData.motivoFallo = motivoFallo;
            }
            const pagoActualizado = await this.paymentsModel
                .findOneAndUpdate({ idTransaccion }, { $set: updateData }, { new: true })
                .lean();
            if (!pagoActualizado) {
                return {
                    data: null,
                    success: false,
                    message: 'NO SE ENCONTRÓ EL PAGO PARA ACTUALIZAR',
                };
            }
            return {
                data: pagoActualizado,
                success: true,
                message: 'ESTADO DE PAGO ACTUALIZADO CON ÉXITO',
            };
        }
        catch (error) {
            return {
                data: null,
                success: false,
                message: `ERROR AL ACTUALIZAR ESTADO DE PAGO: ${error.message}`,
            };
        }
    }
    generarIdTransaccion() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8);
        return `TXN_${timestamp}_${random}`;
    }
    calcularFechaExpiracion(metodoPago) {
        const ahora = new Date();
        switch (metodoPago) {
            case 'pagopar':
                return new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
            case 'bancard':
                return new Date(ahora.getTime() + 30 * 60 * 1000);
            case 'efectivo contra entrega':
            case 'tarjeta contra entrega':
                return new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
            default:
                return new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
        }
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(payments_schema_1.Payments.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        payment_error_service_1.PaymentErrorService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map