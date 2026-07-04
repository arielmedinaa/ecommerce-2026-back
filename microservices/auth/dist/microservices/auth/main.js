"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const auth_module_1 = require("./auth.module");
const common_1 = require("@nestjs/common");
const microservice_config_1 = require("../../shared/config/microservice/microservice.config");
const config_1 = require("@nestjs/config");
const json_logger_1 = require("../../shared/common/logging/json-logger");
const rpc_request_context_interceptor_1 = require("../../shared/common/interceptors/rpc-request-context.interceptor");
const response_transform_interceptor_1 = require("../../shared/common/interceptors/response-transform.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(auth_module_1.AuthModule, {
        abortOnError: false,
        logger: process.env.LOG_FORMAT === 'json' ? new json_logger_1.JsonLogger('auth') : undefined,
    });
    app.useGlobalInterceptors(new rpc_request_context_interceptor_1.RpcRequestContextInterceptor(), new response_transform_interceptor_1.ResponseTransformInterceptor());
    const configService = app.get(config_1.ConfigService);
    const microservicePort = configService.get('AUTH_PORT', microservice_config_1.SERVICE_PORTS.AUTH);
    app.connectMicroservice((0, microservice_config_1.getNatsServerOptions)('AUTH_SERVICE'), { inheritAppConfig: true });
    await app.startAllMicroservices();
    const httpPort = 3001;
    await app.listen(httpPort);
    const logger = new common_1.Logger('AuthMicroservice');
    logger.log(`Auth microservice is running on HTTP port ${httpPort}`);
    logger.log(`Microservice (NATS) listening, queue group AUTH_SERVICE_QUEUE (http port hint ${microservicePort})`);
}
async function bootstrapWithRetry() {
    let attempt = 0;
    while (true) {
        try {
            attempt++;
            await bootstrap();
            break;
        }
        catch (err) {
            const delayMs = Math.min(30000, 1000 * attempt);
            console.error(`Auth bootstrap failed (attempt ${attempt}). Retrying in ${delayMs}ms`, err);
            await new Promise((r) => setTimeout(r, delayMs));
        }
    }
}
bootstrapWithRetry();
//# sourceMappingURL=main.js.map