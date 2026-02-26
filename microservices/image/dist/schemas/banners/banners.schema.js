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
exports.BannersSchema = exports.Banners = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Banners = class Banners {
};
exports.Banners = Banners;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, trim: true }),
    __metadata("design:type", String)
], Banners.prototype, "nombre", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Banners.prototype, "imagen", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Banners.prototype, "variante", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 'webp' }),
    __metadata("design:type", String)
], Banners.prototype, "formato", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Banners.prototype, "ruta", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Banners.prototype, "estado", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Banners.prototype, "creadoPor", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Banners.prototype, "modificadoPor", void 0);
exports.Banners = Banners = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: true,
        collection: 'banners'
    })
], Banners);
exports.BannersSchema = mongoose_1.SchemaFactory.createForClass(Banners);
exports.BannersSchema.index({ creadoPor: 1 });
exports.BannersSchema.index({ modificadoPor: 1 });
exports.BannersSchema.index({ createdAt: -1 });
exports.BannersSchema.index({ updatedAt: -1 });
//# sourceMappingURL=banners.schema.js.map