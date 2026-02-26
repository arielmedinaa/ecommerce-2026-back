"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModule = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("@shared/config/database/database.module");
const payments_schema_1 = require("./schemas/payments.schema");
const payment_error_schema_1 = require("./schemas/errors/payment.error.schema");
const mongoose_1 = require("@nestjs/mongoose");
const payments_service_1 = require("./service/payments.service");
const payments_controller_1 = require("./controller/payments.controller");
const payments_spec_1 = require("./service/payments.spec");
const payment_error_service_1 = require("./service/errors/payment-error.service");
const core_1 = require("@nestjs/core");
const error_logging_interceptor_1 = require("./interceptors/error-logging.interceptor");
let PaymentModule = class PaymentModule {
};
exports.PaymentModule = PaymentModule;
exports.PaymentModule = PaymentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: payments_schema_1.Payments.name, schema: payments_schema_1.PaymentsSchema },
                { name: payment_error_schema_1.PaymentError.name, schema: payment_error_schema_1.PaymentErrorSchema },
            ]),
            database_module_1.DatabaseModule.forRoot(),
        ],
        controllers: [payments_controller_1.PaymentsController],
        providers: [
            payments_service_1.PaymentsService,
            payments_spec_1.PaymentsValidationService,
            payment_error_service_1.PaymentErrorService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: error_logging_interceptor_1.ErrorLoggingInterceptor,
            },
        ],
        exports: [payments_service_1.PaymentsService, payments_spec_1.PaymentsValidationService, payment_error_service_1.PaymentErrorService],
    })
], PaymentModule);
//# sourceMappingURL=payments.module.js.map