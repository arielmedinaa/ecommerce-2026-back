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
exports.PromosService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const promos_schema_1 = require("../schemas/promos.schema");
let PromosService = class PromosService {
    constructor(promoModel) {
        this.promoModel = promoModel;
    }
    async findAll(filters = {}) {
        const query = { 'estado.descripcion': 'Vigente' };
        const projection = { 'contenido.producto': { $slice: 1 } };
        return this.promoModel
            .find(query, projection)
            .limit(Number(filters.limit))
            .skip(Number(filters.offset))
            .sort({ _id: 1 })
            .lean();
    }
};
exports.PromosService = PromosService;
exports.PromosService = PromosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(promos_schema_1.Promo.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], PromosService);
//# sourceMappingURL=promos.service.js.map