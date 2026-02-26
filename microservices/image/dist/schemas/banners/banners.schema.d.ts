import { Document } from 'mongoose';
export type BannersDocument = Banners & Document;
export declare class Banners {
    nombre: string;
    imagen: string;
    variante: string;
    formato: string;
    ruta: string;
    estado: string;
    creadoPor: string;
    modificadoPor: string;
}
export declare const BannersSchema: import("mongoose").Schema<Banners, import("mongoose").Model<Banners, any, any, any, (Document<unknown, any, Banners, any, import("mongoose").DefaultSchemaOptions> & Banners & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Banners, any, import("mongoose").DefaultSchemaOptions> & Banners & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, Banners>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Banners, Document<unknown, {}, Banners, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Banners & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    nombre?: import("mongoose").SchemaDefinitionProperty<string, Banners, Document<unknown, {}, Banners, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Banners & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    imagen?: import("mongoose").SchemaDefinitionProperty<string, Banners, Document<unknown, {}, Banners, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Banners & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    variante?: import("mongoose").SchemaDefinitionProperty<string, Banners, Document<unknown, {}, Banners, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Banners & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    formato?: import("mongoose").SchemaDefinitionProperty<string, Banners, Document<unknown, {}, Banners, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Banners & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    ruta?: import("mongoose").SchemaDefinitionProperty<string, Banners, Document<unknown, {}, Banners, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Banners & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    estado?: import("mongoose").SchemaDefinitionProperty<string, Banners, Document<unknown, {}, Banners, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Banners & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    creadoPor?: import("mongoose").SchemaDefinitionProperty<string, Banners, Document<unknown, {}, Banners, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Banners & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    modificadoPor?: import("mongoose").SchemaDefinitionProperty<string, Banners, Document<unknown, {}, Banners, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Banners & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, Banners>;
