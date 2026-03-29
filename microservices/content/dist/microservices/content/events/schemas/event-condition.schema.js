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
exports.EventCondition = exports.ConditionType = void 0;
const typeorm_1 = require("typeorm");
const event_schema_1 = require("./event.schema");
var ConditionType;
(function (ConditionType) {
    ConditionType["MIN_CARRITO"] = "MIN_CARRITO";
    ConditionType["MAX_UNIDADES_PEDIDO"] = "MAX_UNIDADES_PEDIDO";
    ConditionType["SOLO_NUEVOS_USUARIOS"] = "SOLO_NUEVOS_USUARIOS";
    ConditionType["METODO_PAGO_ESPECIFICO"] = "METODO_PAGO_ESPECIFICO";
})(ConditionType || (exports.ConditionType = ConditionType = {}));
let EventCondition = class EventCondition {
};
exports.EventCondition = EventCondition;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], EventCondition.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => event_schema_1.Event, (evento) => evento.conditions),
    (0, typeorm_1.JoinColumn)({ name: 'evento_id' }),
    __metadata("design:type", event_schema_1.Event)
], EventCondition.prototype, "evento", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], EventCondition.prototype, "evento_id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ConditionType,
    }),
    __metadata("design:type", String)
], EventCondition.prototype, "tipo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], EventCondition.prototype, "valor", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], EventCondition.prototype, "activo", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], EventCondition.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], EventCondition.prototype, "updatedAt", void 0);
exports.EventCondition = EventCondition = __decorate([
    (0, typeorm_1.Entity)('eventos_condiciones')
], EventCondition);
//# sourceMappingURL=event-condition.schema.js.map