"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageModule = void 0;
const common_1 = require("@nestjs/common");
const banners_tcp_controller_1 = require("./controller/tcp/banners.tcp.controller");
const image_http_controller_1 = require("./controller/http/image.http.controller");
const image_banners_service_1 = require("./service/image.banners.service");
const image_spec_1 = require("./service/errors/image.spec");
const banner_error_service_1 = require("./service/errors/banner-error.service");
const mongoose_1 = require("@nestjs/mongoose");
const banners_schema_1 = require("./schemas/banners/banners.schema");
const banners_error_schema_1 = require("./schemas/errors/banners.error.schema");
const database_module_1 = require("@shared/config/database/database.module");
let ImageModule = class ImageModule {
};
exports.ImageModule = ImageModule;
exports.ImageModule = ImageModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule.forRoot(),
            mongoose_1.MongooseModule.forFeature([
                { name: banners_schema_1.Banners.name, schema: banners_schema_1.BannersSchema },
                { name: banners_error_schema_1.BannerError.name, schema: banners_error_schema_1.BannerErrorSchema }
            ])
        ],
        controllers: [banners_tcp_controller_1.BannersController, image_http_controller_1.ImageHttpController],
        providers: [
            image_banners_service_1.BannerService,
            image_spec_1.BannerValidationService,
            banner_error_service_1.BannerErrorService
        ],
        exports: [
            image_banners_service_1.BannerService,
            image_spec_1.BannerValidationService,
            banner_error_service_1.BannerErrorService
        ]
    })
], ImageModule);
//# sourceMappingURL=image.module.js.map