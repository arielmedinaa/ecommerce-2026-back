import mongoose from "mongoose";

const esquemaCategoria = new mongoose.Schema({
    categoria: Array
});

export const Categoria = mongoose.model('categorias', esquemaCategoria);