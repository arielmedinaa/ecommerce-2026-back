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
exports.LandingSchema = exports.Landing = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let Landing = class Landing {
};
exports.Landing = Landing;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Landing.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], Landing.prototype, "slug", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Landing.prototype, "content", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], Landing.prototype, "createdBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Landing.prototype, "updatedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Landing.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Landing.prototype, "isPublished", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], Landing.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], Landing.prototype, "metaTitle", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], Landing.prototype, "metaDescription", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Landing.prototype, "metaKeywords", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Landing.prototype, "viewCount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Landing.prototype, "tags", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Landing.prototype, "customStyles", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Landing.prototype, "customScripts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Landing.prototype, "publicadoEn", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Landing.prototype, "expiraEn", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], Landing.prototype, "tituloRelacionado", void 0);
exports.Landing = Landing = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'landings' })
], Landing);
exports.LandingSchema = mongoose_1.SchemaFactory.createForClass(Landing);
exports.LandingSchema.index({ title: 1 }, { unique: true, name: 'title_unique' });
exports.LandingSchema.index({ slug: 1 }, { unique: true, name: 'slug_unique' });
exports.LandingSchema.index({ createdBy: 1 });
exports.LandingSchema.index({ isActive: 1 });
exports.LandingSchema.index({ isPublished: 1 });
exports.LandingSchema.index({ createdAt: -1 });
exports.LandingSchema.index({ updatedAt: -1 });
exports.LandingSchema.index({ tags: 1 });
exports.LandingSchema.index({ publishedAt: -1 });
//# sourceMappingURL=landings.schemas.js.map