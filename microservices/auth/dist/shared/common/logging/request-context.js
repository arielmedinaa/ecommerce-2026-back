"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestContext = void 0;
const async_hooks_1 = require("async_hooks");
class RequestContextImpl {
    constructor() {
        this.als = new async_hooks_1.AsyncLocalStorage();
    }
    run(store, fn) {
        return this.als.run(store, fn);
    }
    get() {
        return this.als.getStore();
    }
}
exports.RequestContext = new RequestContextImpl();
//# sourceMappingURL=request-context.js.map