import { Types, Document } from "mongoose";
export type LandingErrorDocument = LandingError & Document;
export declare class LandingError {
    landingId?: Types.ObjectId;
    errorCode: string;
    message: string;
    context: Record<string, any>;
    stackTrace?: string;
    path?: string;
    userId?: Types.ObjectId;
    operation?: string;
    requestPayload?: Record<string, any>;
}
export declare const LandingErrorSchema: import("mongoose").Schema<LandingError, import("mongoose").Model<LandingError, any, any, any, Document<unknown, any, LandingError, any, import("mongoose").DefaultSchemaOptions> & LandingError & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any, LandingError>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, LandingError, Document<unknown, {}, LandingError, {
    id: string;
}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<LandingError & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    landingId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LandingError, Document<unknown, {}, LandingError, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<LandingError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    errorCode?: import("mongoose").SchemaDefinitionProperty<string, LandingError, Document<unknown, {}, LandingError, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<LandingError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    message?: import("mongoose").SchemaDefinitionProperty<string, LandingError, Document<unknown, {}, LandingError, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<LandingError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    context?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, LandingError, Document<unknown, {}, LandingError, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<LandingError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    stackTrace?: import("mongoose").SchemaDefinitionProperty<string, LandingError, Document<unknown, {}, LandingError, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<LandingError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    path?: import("mongoose").SchemaDefinitionProperty<string, LandingError, Document<unknown, {}, LandingError, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<LandingError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    userId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, LandingError, Document<unknown, {}, LandingError, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<LandingError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    operation?: import("mongoose").SchemaDefinitionProperty<string, LandingError, Document<unknown, {}, LandingError, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<LandingError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    requestPayload?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, LandingError, Document<unknown, {}, LandingError, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<LandingError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, LandingError>;
