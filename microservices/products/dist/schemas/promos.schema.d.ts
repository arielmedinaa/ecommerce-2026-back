export type PromoDocument = Promo & Document;
export declare class Promo {
    codigo: string;
    nombre: string;
    descripcion: string;
    ruta: string;
    fecha: string;
    hora: string;
    tiempo: Object;
    contenido: Object;
    visibilidad: Object;
    configuracion: Object;
    estado: Object;
    cantidadCliente: Number;
}
export declare const PromoSchema: import("mongoose").Schema<Promo, import("mongoose").Model<Promo, any, any, any, (import("mongoose").Document<unknown, any, Promo, any, import("mongoose").DefaultSchemaOptions> & Promo & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (import("mongoose").Document<unknown, any, Promo, any, import("mongoose").DefaultSchemaOptions> & Promo & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}), any, Promo>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Promo, import("mongoose").Document<unknown, {}, Promo, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    codigo?: import("mongoose").SchemaDefinitionProperty<string, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    nombre?: import("mongoose").SchemaDefinitionProperty<string, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    descripcion?: import("mongoose").SchemaDefinitionProperty<string, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    ruta?: import("mongoose").SchemaDefinitionProperty<string, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    fecha?: import("mongoose").SchemaDefinitionProperty<string, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    hora?: import("mongoose").SchemaDefinitionProperty<string, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    tiempo?: import("mongoose").SchemaDefinitionProperty<Object, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    contenido?: import("mongoose").SchemaDefinitionProperty<Object, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    visibilidad?: import("mongoose").SchemaDefinitionProperty<Object, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    configuracion?: import("mongoose").SchemaDefinitionProperty<Object, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    estado?: import("mongoose").SchemaDefinitionProperty<Object, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    cantidadCliente?: import("mongoose").SchemaDefinitionProperty<Number, Promo, import("mongoose").Document<unknown, {}, Promo, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Promo & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, Promo>;
