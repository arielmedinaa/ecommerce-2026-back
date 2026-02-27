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
exports.ObtenerClaveService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const llave_schema_1 = require("@cart/schemas/llave.schema");
let ObtenerClaveService = class ObtenerClaveService {
    constructor(llaveModel) {
        this.llaveModel = llaveModel;
    }
    async obtenerClave(tabla) {
        const llave = await this.llaveModel.findOne({ tabla });
        if (!llave) {
            const newKey = new this.llaveModel({ tabla, valor: 1 });
            await newKey.save();
            return 1;
        }
        llave.valor += 1;
        await llave.save();
        return llave.valor;
    }
};
exports.ObtenerClaveService = ObtenerClaveService;
exports.ObtenerClaveService = ObtenerClaveService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(llave_schema_1.Llave.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ObtenerClaveService);
//# sourceMappingURL=obtenerClave.js.map