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
exports.FormatoSchema = exports.Formato = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Formato = class Formato {
};
exports.Formato = Formato;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Formato.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, unique: true }),
    __metadata("design:type", String)
], Formato.prototype, "slug", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Formato.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Formato.prototype, "template", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['html', 'react', 'jsx'] }),
    __metadata("design:type", String)
], Formato.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Formato.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Formato.prototype, "tags", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Formato.prototype, "preview", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Formato.prototype, "config", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Array)
], Formato.prototype, "variables", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Formato.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Formato.prototype, "isPremium", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Formato.prototype, "usageCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Formato.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Formato.prototype, "updatedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], Formato.prototype, "sortOrder", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], Formato.prototype, "documentation", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Formato.prototype, "metadata", void 0);
exports.Formato = Formato = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'formatos_landing' })
], Formato);
exports.FormatoSchema = mongoose_1.SchemaFactory.createForClass(Formato);
exports.FormatoSchema.index({ slug: 1 });
exports.FormatoSchema.index({ type: 1 });
exports.FormatoSchema.index({ category: 1 });
exports.FormatoSchema.index({ isActive: 1 });
exports.FormatoSchema.index({ isPremium: 1 });
exports.FormatoSchema.index({ createdBy: 1 });
exports.FormatoSchema.index({ createdAt: -1 });
exports.FormatoSchema.index({ sortOrder: 1 });
exports.FormatoSchema.index({ tags: 1 });
//# sourceMappingURL=formatos.schema.js.map