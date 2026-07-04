"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonLogger = void 0;
const request_context_1 = require("./request-context");
function safeSerialize(value) {
    try {
        if (value instanceof Error) {
            return {
                name: value.name,
                message: value.message,
                stack: value.stack,
            };
        }
        return value;
    }
    catch {
        return String(value);
    }
}
class JsonLogger {
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    log(message, context) {
        this.write('log', message, context);
    }
    error(message, stack, context) {
        const meta = {};
        if (stack)
            meta.stack = stack;
        this.write('error', message, context, meta);
    }
    warn(message, context) {
        this.write('warn', message, context);
    }
    debug(message, context) {
        this.write('debug', message, context);
    }
    verbose(message, context) {
        this.write('verbose', message, context);
    }
    write(level, message, context, meta) {
        const ctx = request_context_1.RequestContext.get();
        const record = {
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            context,
            requestId: ctx?.requestId,
            userId: ctx?.userId,
            message: safeSerialize(message),
            ...(meta && Object.keys(meta).length > 0 ? { meta: safeSerialize(meta) } : {}),
        };
        const line = JSON.stringify(record);
        if (level === 'error') {
            console.error(line);
        }
        else {
            console.log(line);
        }
    }
}
exports.JsonLogger = JsonLogger;
//# sourceMappingURL=json-logger.js.map