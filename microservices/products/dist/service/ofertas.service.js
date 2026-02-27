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
exports.OfertasService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const ofertas_spec_1 = require("./errors/ofertas.spec");
const ofertas_schema_1 = require("@products/schemas/ofertas.schema");
let OfertasService = class OfertasService {
    constructor(ofertaModel, ofertasValidationService) {
        this.ofertaModel = ofertaModel;
        this.ofertasValidationService = ofertasValidationService;
    }
    async createOrUpdateOferta(createData, codigo) {
        const validation = await this.ofertasValidationService.validateOfertaPayload(createData, codigo);
        if (!validation.isValid) {
            return validation.error;
        }
        try {
            const existingOferta = await this.ofertaModel.findOne({ activo: true });
            if (existingOferta) {
                const updatedOferta = await this.ofertaModel.findByIdAndUpdate(existingOferta._id, {
                    ...createData,
                    updatedAt: new Date(),
                }, { new: true });
                return {
                    data: updatedOferta,
                    message: 'OFERTA ACTUALIZADO EXITOSAMENTE',
                    success: true,
                };
            }
            else {
                const newOferta = await this.ofertaModel.create({
                    ...createData,
                    activo: createData.activo !== undefined ? createData.activo : true,
                });
                return {
                    data: newOferta,
                    message: 'OFERTA CREADO EXITOSAMENTE',
                    success: true,
                };
            }
        }
        catch (error) {
            return {
                data: [],
                message: `Error al crear/actualizar la oferta: ${error.message}`,
                success: false,
            };
        }
    }
    async getActiveOferta() {
        try {
            const oferta = await this.ofertaModel.findOne({ activo: true });
            return {
                data: oferta,
                message: oferta ? 'Oferta activa encontrada' : 'No hay ofertas activas',
                success: true,
            };
        }
        catch (error) {
            return {
                data: [],
                message: `Error al obtener la oferta activa: ${error.message}`,
                success: false,
            };
        }
    }
    async getAllOfertas() {
        try {
            const ofertas = await this.ofertaModel.find().sort({ createdAt: -1 });
            return {
                data: ofertas,
                message: 'Ofertas obtenidas exitosamente',
                success: true,
            };
        }
        catch (error) {
            return {
                data: [],
                message: `Error al obtener las ofertas: ${error.message}`,
                success: false,
            };
        }
    }
    async deleteOferta(id) {
        const idValidation = await this.ofertasValidationService.validateOfertaId(id);
        if (!idValidation.isValid) {
            return idValidation.error;
        }
        try {
            const oferta = await this.ofertaModel.findById(id);
            if (!oferta) {
                return {
                    data: null,
                    message: 'Oferta no encontrada',
                    success: false,
                };
            }
            await this.ofertaModel.findByIdAndDelete(id);
            return {
                data: null,
                message: 'Oferta eliminada exitosamente',
                success: true,
            };
        }
        catch (error) {
            return {
                data: null,
                message: `Error al eliminar la oferta: ${error.message}`,
                success: false,
            };
        }
    }
    async toggleOfertaStatus(id) {
        const idValidation = await this.ofertasValidationService.validateOfertaId(id);
        if (!idValidation.isValid) {
            return idValidation.error;
        }
        try {
            const oferta = await this.ofertaModel.findById(id);
            if (!oferta) {
                return {
                    data: [],
                    message: 'Oferta no encontrada',
                    success: false,
                };
            }
            const updatedOferta = await this.ofertaModel.findByIdAndUpdate(id, {
                activo: !oferta.activo,
                updatedAt: new Date(),
            }, { new: true });
            return {
                data: updatedOferta,
                message: `Oferta ${updatedOferta?.activo ? 'activada' : 'desactivada'} exitosamente`,
                success: true,
            };
        }
        catch (error) {
            return {
                data: [],
                message: `Error al cambiar el estado de la oferta: ${error.message}`,
                success: false,
            };
        }
    }
};
exports.OfertasService = OfertasService;
exports.OfertasService = OfertasService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(ofertas_schema_1.Ofertas.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        ofertas_spec_1.OfertasValidationService])
], OfertasService);
//# sourceMappingURL=ofertas.service.js.map