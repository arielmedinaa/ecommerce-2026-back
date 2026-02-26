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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfertasSchema = exports.Ofertas = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("@nestjs/mongoose");
class ProductoOferta {
}
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", String)
], ProductoOferta.prototype, "nombre", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", String)
], ProductoOferta.prototype, "codigo", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", Number)
], ProductoOferta.prototype, "tiempoActivo", void 0);
__decorate([
    (0, mongoose_2.Prop)({ type: Number }),
    __metadata("design:type", Number)
], ProductoOferta.prototype, "descuento", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true, type: Number }),
    __metadata("design:type", Number)
], ProductoOferta.prototype, "precioContado", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true, type: Number }),
    __metadata("design:type", Number)
], ProductoOferta.prototype, "precioCredito", void 0);
__decorate([
    (0, mongoose_2.Prop)([{
            cantidad: { type: Number, required: true },
            valor: { type: Number, required: true }
        }]),
    __metadata("design:type", Array)
], ProductoOferta.prototype, "cuotas", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ProductoOferta.prototype, "activo", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProductoOferta.prototype, "prioridad", void 0);
let Ofertas = class Ofertas {
};
exports.Ofertas = Ofertas;
__decorate([
    (0, mongoose_2.Prop)({ type: [ProductoOferta], validate: {
            validator: function (v) {
                return v.length <= 12;
            },
            message: 'El array de productos no puede tener más de 12 elementos'
        } }),
    __metadata("design:type", Array)
], Ofertas.prototype, "productos", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true, type: Number }),
    __metadata("design:type", Number)
], Ofertas.prototype, "tiempoActivo", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Ofertas.prototype, "activo", void 0);
exports.Ofertas = Ofertas = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: true,
        collection: 'ofertas',
        autoIndex: true
    })
], Ofertas);
exports.OfertasSchema = mongoose_2.SchemaFactory.createForClass(Ofertas);
exports.OfertasSchema.index({ activo: 1, tiempoActivo: 1 });
//# sourceMappingURL=ofertas.schema.js.map