import mongoose from "mongoose";
export declare const Categoria: mongoose.Model<{
    categoria: any[];
}, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    categoria: any[];
}, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<{
    categoria: any[];
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    categoria: any[];
}, mongoose.Document<unknown, {}, {
    categoria: any[];
}, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<{
    categoria: any[];
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    [path: string]: mongoose.SchemaDefinitionProperty<undefined, any, any>;
} | {
    [x: string]: mongoose.SchemaDefinitionProperty<any, any, mongoose.Document<unknown, {}, {
        categoria: any[];
    }, {
        id: string;
    }, mongoose.DefaultSchemaOptions> & Omit<{
        categoria: any[];
    } & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, {
    categoria: any[];
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    categoria: any[];
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
