export declare class GuestToken {
    token: string;
    ipAddress: string;
    userAgent: string;
    isActive: boolean;
    expiresAt: Date;
    lastUsedAt: Date;
}
export declare const GuestTokenSchema: import("mongoose").Schema<GuestToken, import("mongoose").Model<GuestToken, any, any, any, import("mongoose").Document<unknown, any, GuestToken, any, import("mongoose").DefaultSchemaOptions> & GuestToken & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any, GuestToken>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, GuestToken, import("mongoose").Document<unknown, {}, GuestToken, {
    id: string;
}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<GuestToken & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    token?: import("mongoose").SchemaDefinitionProperty<string, GuestToken, import("mongoose").Document<unknown, {}, GuestToken, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<GuestToken & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    ipAddress?: import("mongoose").SchemaDefinitionProperty<string, GuestToken, import("mongoose").Document<unknown, {}, GuestToken, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<GuestToken & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    userAgent?: import("mongoose").SchemaDefinitionProperty<string, GuestToken, import("mongoose").Document<unknown, {}, GuestToken, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<GuestToken & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, GuestToken, import("mongoose").Document<unknown, {}, GuestToken, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<GuestToken & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    expiresAt?: import("mongoose").SchemaDefinitionProperty<Date, GuestToken, import("mongoose").Document<unknown, {}, GuestToken, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<GuestToken & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    lastUsedAt?: import("mongoose").SchemaDefinitionProperty<Date, GuestToken, import("mongoose").Document<unknown, {}, GuestToken, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<GuestToken & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, GuestToken>;
