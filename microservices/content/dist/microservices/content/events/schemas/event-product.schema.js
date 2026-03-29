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
exports.EventProduct = void 0;
const typeorm_1 = require("typeorm");
const event_schema_1 = require("./event.schema");
let EventProduct = class EventProduct {
};
exports.EventProduct = EventProduct;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], EventProduct.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => event_schema_1.Event, (evento) => evento.eventProducts),
    (0, typeorm_1.JoinColumn)({ name: 'evento_id' }),
    __metadata("design:type", event_schema_1.Event)
], EventProduct.prototype, "evento", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], EventProduct.prototype, "evento_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], EventProduct.prototype, "producto_codigo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], EventProduct.prototype, "limitePorUsuario", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], EventProduct.prototype, "precioOferta", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], EventProduct.prototype, "createdAt", void 0);
exports.EventProduct = EventProduct = __decorate([
    (0, typeorm_1.Entity)('eventos_productos')
], EventProduct);
//# sourceMappingURL=event-product.schema.js.map