import { Types, Document } from "mongoose";
export type BannerErrorDocument = BannerError & Document;
export declare class BannerError {
    bannerId: Types.ObjectId;
    errorCode: string;
    message: string;
    context: Record<string, any>;
    stackTrace?: string;
    path?: string;
    operation?: string;
    userId?: string;
    fileName?: string;
    device?: string;
}
export declare const BannerErrorSchema: import("mongoose").Schema<BannerError, import("mongoose").Model<BannerError, any, any, any, (Document<unknown, any, BannerError, any, import("mongoose").DefaultSchemaOptions> & BannerError & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, BannerError, any, import("mongoose").DefaultSchemaOptions> & BannerError & {
    _id: Types.ObjectId;
} & {
    __v: number;
}), any, BannerError>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, BannerError, Document<unknown, {}, BannerError, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<BannerError & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    bannerId?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, BannerError, Document<unknown, {}, BannerError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BannerError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    errorCode?: import("mongoose").SchemaDefinitionProperty<string, BannerError, Document<unknown, {}, BannerError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BannerError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    message?: import("mongoose").SchemaDefinitionProperty<string, BannerError, Document<unknown, {}, BannerError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BannerError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    context?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, BannerError, Document<unknown, {}, BannerError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BannerError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    stackTrace?: import("mongoose").SchemaDefinitionProperty<string, BannerError, Document<unknown, {}, BannerError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BannerError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    path?: import("mongoose").SchemaDefinitionProperty<string, BannerError, Document<unknown, {}, BannerError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BannerError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    operation?: import("mongoose").SchemaDefinitionProperty<string, BannerError, Document<unknown, {}, BannerError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BannerError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    userId?: import("mongoose").SchemaDefinitionProperty<string, BannerError, Document<unknown, {}, BannerError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BannerError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    fileName?: import("mongoose").SchemaDefinitionProperty<string, BannerError, Document<unknown, {}, BannerError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BannerError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    device?: import("mongoose").SchemaDefinitionProperty<string, BannerError, Document<unknown, {}, BannerError, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<BannerError & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, BannerError>;
