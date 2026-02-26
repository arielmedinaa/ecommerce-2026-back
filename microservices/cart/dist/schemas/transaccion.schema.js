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
exports.TransaccionSchema = exports.Transaccion = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Transaccion = class Transaccion {
};
exports.Transaccion = Transaccion;
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], Transaccion.prototype, "codigo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], Transaccion.prototype, "carrito", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Transaccion.prototype, "tiempo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], Transaccion.prototype, "estado", void 0);
exports.Transaccion = Transaccion = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'transacciones' })
], Transaccion);
exports.TransaccionSchema = mongoose_1.SchemaFactory.createForClass(Transaccion);
//# sourceMappingURL=transaccion.schema.js.map