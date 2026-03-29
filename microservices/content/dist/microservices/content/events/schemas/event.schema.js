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
exports.Event = void 0;
const typeorm_1 = require("typeorm");
const event_product_schema_1 = require("./event-product.schema");
const verticales_schemas_1 = require("../../verticales/schemas/verticales.schemas");
const landings_schemas_1 = require("../../landings/schemas/landings.schemas");
const event_condition_schema_1 = require("./event-condition.schema");
let Event = class Event {
};
exports.Event = Event;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Event.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Event.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Event.prototype, "descripcion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], Event.prototype, "fechaInicio", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], Event.prototype, "fechaFin", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Event.prototype, "activo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], Event.prototype, "limiteGlobalPorUsuario", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Event.prototype, "beneficioUsuarioEspecifico", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Event.prototype, "prioridad", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Event.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Event.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => event_product_schema_1.EventProduct, (eventProduct) => eventProduct.evento),
    __metadata("design:type", Array)
], Event.prototype, "eventProducts", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => event_condition_schema_1.EventCondition, (condition) => condition.evento),
    __metadata("design:type", Array)
], Event.prototype, "conditions", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], Event.prototype, "idEventoPadre", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Event, (event) => event.subEventos),
    (0, typeorm_1.JoinColumn)({ name: 'idEventoPadre' }),
    __metadata("design:type", Event)
], Event.prototype, "eventoPadre", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Event, (event) => event.eventoPadre),
    __metadata("design:type", Array)
], Event.prototype, "subEventos", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0, nullable: true, type: 'int' }),
    __metadata("design:type", Number)
], Event.prototype, "idPromo", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => verticales_schemas_1.Vertical, (vertical) => vertical.id),
    __metadata("design:type", Array)
], Event.prototype, "idVerticales", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => landings_schemas_1.Landing, (landing) => landing.id),
    __metadata("design:type", Array)
], Event.prototype, "idLandings", void 0);
exports.Event = Event = __decorate([
    (0, typeorm_1.Entity)('eventos')
], Event);
//# sourceMappingURL=event.schema.js.map