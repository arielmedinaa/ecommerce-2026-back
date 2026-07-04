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
exports.User = void 0;
const typeorm_1 = require("typeorm");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 500 }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: '' }),
    __metadata("design:type", String)
], User.prototype, "numeroCelular", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: '', length: 20 }),
    __metadata("design:type", String)
], User.prototype, "numeroDocumento", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "avatar", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], User.prototype, "proveedor", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 500 }),
    __metadata("design:type", String)
], User.prototype, "idProveedor", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "estaActivo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "ultimoInicioSesion", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "esInvitado", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'cliente' }),
    __metadata("design:type", String)
], User.prototype, "perfil", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "infoDispositivo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], User.prototype, "direcciones", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'longtext', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "parentescos", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "fechaExpiracion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true, default: 'NUEVO_USUARIO' }),
    __metadata("design:type", Array)
], User.prototype, "etiquetas", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "fechaCreacion", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], User.prototype, "fechaActualizacion", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'NUEVO_USUARIO' }),
    __metadata("design:type", String)
], User.prototype, "beneficioUsuario", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('usuarios')
], User);
//# sourceMappingURL=user.schemas.js.map