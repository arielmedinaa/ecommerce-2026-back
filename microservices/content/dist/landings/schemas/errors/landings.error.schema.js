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
exports.LandingErrorSchema = exports.LandingError = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let LandingError = class LandingError {
};
exports.LandingError = LandingError;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Landing', index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], LandingError.prototype, "landingId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LandingError.prototype, "errorCode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LandingError.prototype, "message", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], LandingError.prototype, "context", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LandingError.prototype, "stackTrace", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LandingError.prototype, "path", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], LandingError.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true }),
    __metadata("design:type", String)
], LandingError.prototype, "operation", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], LandingError.prototype, "requestPayload", void 0);
exports.LandingError = LandingError = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'logs_landings' })
], LandingError);
exports.LandingErrorSchema = mongoose_1.SchemaFactory.createForClass(LandingError);
exports.LandingErrorSchema.index({ landingId: 1 });
exports.LandingErrorSchema.index({ errorCode: 1 });
exports.LandingErrorSchema.index({ createdAt: -1 });
exports.LandingErrorSchema.index({ userId: 1 });
exports.LandingErrorSchema.index({ operation: 1 });
//# sourceMappingURL=landings.error.schema.js.map