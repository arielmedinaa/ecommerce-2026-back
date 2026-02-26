"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var OfertasValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfertasValidationService = void 0;
const common_1 = require("@nestjs/common");
let OfertasValidationService = OfertasValidationService_1 = class OfertasValidationService {
    constructor() {
        this.logger = new common_1.Logger(OfertasValidationService_1.name);
    }
    async validateOfertaPayload(createData, codigo) {
        if (!createData.productos || createData.productos.length === 0) {
            this.logger.error('La oferta debe tener al menos un producto');
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'La oferta debe tener al menos un producto',
                    data: [],
                },
            };
        }
        if (createData.productos.length > 12) {
            this.logger.error('La oferta no puede tener más de 12 productos');
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'La oferta no puede tener más de 12 productos',
                    data: [],
                },
            };
        }
        for (const producto of createData.productos) {
            if (!producto.nombre || producto.nombre.trim() === '') {
                this.logger.error('Todos los productos deben tener nombre');
                return {
                    isValid: false,
                    error: {
                        success: false,
                        message: 'Todos los productos deben tener nombre',
                        data: [],
                    },
                };
            }
            if (!producto.codigo || producto.codigo.trim() === '') {
                this.logger.error('Todos los productos deben tener código');
                return {
                    isValid: false,
                    error: {
                        success: false,
                        message: 'Todos los productos deben tener código',
                        data: [],
                    },
                };
            }
            if (producto.descuento !== undefined && producto.descuento < 0) {
                this.logger.error('El descuento no puede ser negativo');
                return {
                    isValid: false,
                    error: {
                        success: false,
                        message: 'El descuento no puede ser negativo',
                        data: [],
                    },
                };
            }
            if (producto.precioContado !== undefined && producto.precioContado < 0) {
                this.logger.error('El precio contado no puede ser negativo');
                return {
                    isValid: false,
                    error: {
                        success: false,
                        message: 'El precio contado no puede ser negativo',
                        data: [],
                    },
                };
            }
            if (producto.precioCredito !== undefined && producto.precioCredito < 0) {
                this.logger.error('El precio crédito no puede ser negativo');
                return {
                    isValid: false,
                    error: {
                        success: false,
                        message: 'El precio crédito no puede ser negativo',
                        data: [],
                    },
                };
            }
            if (producto.tiempoActivo !== undefined && producto.tiempoActivo < 0) {
                this.logger.error('El tiempo activo del producto no puede ser negativo');
                return {
                    isValid: false,
                    error: {
                        success: false,
                        message: 'El tiempo activo del producto no puede ser negativo',
                        data: [],
                    },
                };
            }
            if (producto.cuotas && Array.isArray(producto.cuotas)) {
                for (const cuota of producto.cuotas) {
                    if (!cuota.cantidad || cuota.cantidad <= 0) {
                        this.logger.error('La cantidad de cuotas debe ser mayor a 0');
                        return {
                            isValid: false,
                            error: {
                                success: false,
                                message: 'La cantidad de cuotas debe ser mayor a 0',
                                data: [],
                            },
                        };
                    }
                    if (cuota.valor !== undefined && cuota.valor < 0) {
                        this.logger.error('El valor de la cuota no puede ser negativo');
                        return {
                            isValid: false,
                            error: {
                                success: false,
                                message: 'El valor de la cuota no puede ser negativo',
                                data: [],
                            },
                        };
                    }
                }
            }
        }
        if (createData.tiempoActivo !== undefined && createData.tiempoActivo <= 0) {
            this.logger.error('El tiempo activo de la oferta debe ser mayor a 0');
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'El tiempo activo de la oferta debe ser mayor a 0',
                    data: [],
                },
            };
        }
        return { isValid: true };
    }
    async validateOfertaId(id) {
        if (!id || id.trim() === '') {
            this.logger.error('ID de oferta inválido');
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'ID de oferta inválido',
                    data: [],
                },
            };
        }
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        if (!objectIdRegex.test(id)) {
            this.logger.error('ID de oferta no tiene formato válido');
            return {
                isValid: false,
                error: {
                    success: false,
                    message: 'ID de oferta no tiene formato válido',
                    data: [],
                },
            };
        }
        return { isValid: true };
    }
};
exports.OfertasValidationService = OfertasValidationService;
exports.OfertasValidationService = OfertasValidationService = OfertasValidationService_1 = __decorate([
    (0, common_1.Injectable)()
], OfertasValidationService);
//# sourceMappingURL=ofertas.spec.js.map