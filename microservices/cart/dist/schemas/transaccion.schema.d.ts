import { Document } from 'mongoose';
export type TransaccionDocument = Transaccion & Document;
export declare class Transaccion {
    codigo: number;
    carrito: number;
    tiempo: Date;
    estado: number;
}
export declare const TransaccionSchema: import("mongoose").Schema<Transaccion, import("mongoose").Model<Transaccion, any, any, any, Document<unknown, any, Transaccion, any, import("mongoose").DefaultSchemaOptions> & Transaccion & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any, Transaccion>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Transaccion, Document<unknown, {}, Transaccion, {
    id: string;
}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Transaccion & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    codigo?: import("mongoose").SchemaDefinitionProperty<number, Transaccion, Document<unknown, {}, Transaccion, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Transaccion & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    carrito?: import("mongoose").SchemaDefinitionProperty<number, Transaccion, Document<unknown, {}, Transaccion, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Transaccion & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    tiempo?: import("mongoose").SchemaDefinitionProperty<Date, Transaccion, Document<unknown, {}, Transaccion, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Transaccion & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    estado?: import("mongoose").SchemaDefinitionProperty<number, Transaccion, Document<unknown, {}, Transaccion, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Transaccion & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, Transaccion>;
