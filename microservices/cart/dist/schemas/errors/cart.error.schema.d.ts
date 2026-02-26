import { Types, Document } from "mongoose";
export type CartErrorDocument = CartError & Document;
export declare class CartError {
    cartId: Types.ObjectId;
    errorCode: string;
    message: string;
    context: Record<string, any>;
    stackTrace?: string;
    path?: string;
}
export declare const CartErrorSchema: import("mongoose").Schema<CartError, import("mongoose").Model<CartError, any, any, any, (Document<unknown, any, CartError, any, import("mongoose").DefaultSchemaOptions> & CartError & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, CartError, any, import("mongoose").DefaultSchemaOptions> & CartError & {
    _id: Types.ObjectId;
} & {
    __v: number;
}), any, CartError>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CartError, Document<unknown, {}, CartError, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<CartError & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    cartId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, CartError, Document<unknown, {}, CartError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CartError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    errorCode?: import("mongoose").SchemaDefinitionProperty<string, CartError, Document<unknown, {}, CartError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CartError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    message?: import("mongoose").SchemaDefinitionProperty<string, CartError, Document<unknown, {}, CartError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CartError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    context?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, CartError, Document<unknown, {}, CartError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CartError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    stackTrace?: import("mongoose").SchemaDefinitionProperty<string, CartError, Document<unknown, {}, CartError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CartError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    path?: import("mongoose").SchemaDefinitionProperty<string, CartError, Document<unknown, {}, CartError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<CartError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, CartError>;
