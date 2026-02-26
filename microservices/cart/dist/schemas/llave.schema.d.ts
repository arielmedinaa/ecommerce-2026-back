import { Document } from 'mongoose';
export type LlaveDocument = Llave & Document;
export declare class Llave {
    tabla: string;
    valor: number;
}
export declare const LlaveSchema: import("mongoose").Schema<Llave, import("mongoose").Model<Llave, any, any, any, (Document<unknown, any, Llave, any, import("mongoose").DefaultSchemaOptions> & Llave & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Llave, any, import("mongoose").DefaultSchemaOptions> & Llave & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, Llave>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Llave, Document<unknown, {}, Llave, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Llave & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    tabla?: import("mongoose").SchemaDefinitionProperty<string, Llave, Document<unknown, {}, Llave, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Llave & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    valor?: import("mongoose").SchemaDefinitionProperty<number, Llave, Document<unknown, {}, Llave, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Llave & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, Llave>;
