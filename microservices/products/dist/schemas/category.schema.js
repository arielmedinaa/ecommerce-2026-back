"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Categoria = void 0;
const mongoose_1 = require("mongoose");
const esquemaCategoria = new mongoose_1.default.Schema({
    categoria: Array
});
exports.Categoria = mongoose_1.default.model('categorias', esquemaCategoria);
//# sourceMappingURL=category.schema.js.map