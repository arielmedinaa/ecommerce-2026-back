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
exports.PaymentsSchema = exports.Payments = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Payments = class Payments {
};
exports.Payments = Payments;
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Payments.prototype, "createdAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Payments.prototype, "updatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], Payments.prototype, "codigoCarrito", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], Payments.prototype, "carrito", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: [
            'pendiente',
            'procesando',
            'completado',
            'fallido',
            'cancelado',
            'reembolsado',
        ],
    }),
    __metadata("design:type", String)
], Payments.prototype, "estado", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        required: true,
        enum: [
            'pagopar',
            'bancard',
            'efectivo contra entrega',
            'tarjeta contra entrega',
        ],
    }),
    __metadata("design:type", String)
], Payments.prototype, "metodoPago", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, required: true }),
    __metadata("design:type", Number)
], Payments.prototype, "monto", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true }),
    __metadata("design:type", String)
], Payments.prototype, "moneda", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Payments.prototype, "respuestaPagopar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Payments.prototype, "respuestaBancard", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Payments.prototype, "idTransaccion", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Payments.prototype, "descripcion", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: Object,
        required: true,
        default: {
            equipo: '',
            nombre: '',
            email: '',
            telefono: '',
            documento: '',
            nroDocumento: '',
        },
    }),
    __metadata("design:type", Object)
], Payments.prototype, "cliente", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], Payments.prototype, "metadatos", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Payments.prototype, "finalizado", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Payments.prototype, "motivoFallo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], Payments.prototype, "intentosReintentar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Payments.prototype, "proximoReintento", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Array)
], Payments.prototype, "reembolsos", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Payments.prototype, "procesado", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Payments.prototype, "expira", void 0);
exports.Payments = Payments = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: true,
        collection: 'transacciones',
    })
], Payments);
exports.PaymentsSchema = mongoose_1.SchemaFactory.createForClass(Payments);
//# sourceMappingURL=payments.schema.js.map