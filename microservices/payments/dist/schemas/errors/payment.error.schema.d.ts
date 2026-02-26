import { Types, Document } from "mongoose";
export type PaymentErrorDocument = PaymentError & Document;
export declare class PaymentError {
    paymentId: Types.ObjectId;
    errorCode: string;
    message: string;
    context: Record<string, any>;
    stackTrace?: string;
    path?: string;
}
export declare const PaymentErrorSchema: import("mongoose").Schema<PaymentError, import("mongoose").Model<PaymentError, any, any, any, (Document<unknown, any, PaymentError, any, import("mongoose").DefaultSchemaOptions> & PaymentError & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, PaymentError, any, import("mongoose").DefaultSchemaOptions> & PaymentError & {
    _id: Types.ObjectId;
} & {
    __v: number;
}), any, PaymentError>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PaymentError, Document<unknown, {}, PaymentError, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<PaymentError & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    paymentId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, PaymentError, Document<unknown, {}, PaymentError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    errorCode?: import("mongoose").SchemaDefinitionProperty<string, PaymentError, Document<unknown, {}, PaymentError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    message?: import("mongoose").SchemaDefinitionProperty<string, PaymentError, Document<unknown, {}, PaymentError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    context?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, PaymentError, Document<unknown, {}, PaymentError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    stackTrace?: import("mongoose").SchemaDefinitionProperty<string, PaymentError, Document<unknown, {}, PaymentError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    path?: import("mongoose").SchemaDefinitionProperty<string, PaymentError, Document<unknown, {}, PaymentError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<PaymentError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, PaymentError>;
