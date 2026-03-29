"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var VerticalValidation_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerticalValidation = void 0;
const common_1 = require("@nestjs/common");
let VerticalValidation = VerticalValidation_1 = class VerticalValidation {
    constructor() {
        this.logger = new common_1.Logger(VerticalValidation_1.name);
    }
    async validateVertical(vertical) {
        if (!vertical.nombre) {
            this.logger.error('Error al validar el nombre de la vertical', {
                vertical,
            });
            return { isValid: false, error: 'Nombre de vertical es requerido' };
        }
        if (!vertical.url) {
            this.logger.error('Error al validar la url de la vertical', {
                vertical,
            });
            return { isValid: false, error: 'Url de vertical es requerida' };
        }
        return { isValid: true, error: null };
    }
    async validateFilters(filters = {}) {
        if (!filters) {
            this.logger.error('Error al validar los filtros', {
                filters,
            });
            return { isValid: false, error: 'Filtros son requeridos' };
        }
        ;
        if (!filters.limit) {
            this.logger.error('Error al validar el limite de los filtros', {
                filters,
            });
            return { isValid: false, error: 'Limite de filtros es requerido' };
        }
        ;
        if (!filters.offset) {
            this.logger.error('Error al validar el offset de los filtros', {
                filters,
            });
            return { isValid: false, error: 'Offset de filtros es requerido' };
        }
        ;
        return { isValid: true, error: null };
    }
};
exports.VerticalValidation = VerticalValidation;
exports.VerticalValidation = VerticalValidation = VerticalValidation_1 = __decorate([
    (0, common_1.Injectable)()
], VerticalValidation);
//# sourceMappingURL=vertical.validation.js.map