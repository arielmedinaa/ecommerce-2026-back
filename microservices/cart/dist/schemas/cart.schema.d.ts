import { Document } from 'mongoose';
export type CartDocument = Cart & Document;
export declare class Cart {
    codigo: number;
    proceso: string;
    cliente: {
        equipo: string;
        razonsocial?: string;
        correo?: string;
        telefono?: string;
        documento?: string;
        tipodocumento?: string;
    };
    tiempo: string;
    transaccion: any[];
    seguimiento: any[];
    envio: Record<string, any>;
    pago: Record<string, any>;
    articulos: Record<string, any>;
    atencion: number;
    estado: number;
    estados: Record<string, any>;
    finished?: string;
}
export declare const CartSchema: import("mongoose").Schema<Cart, import("mongoose").Model<Cart, any, any, any, Document<unknown, any, Cart, any, import("mongoose").DefaultSchemaOptions> & Cart & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any, Cart>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Cart, Document<unknown, {}, Cart, {
    id: string;
}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    codigo?: import("mongoose").SchemaDefinitionProperty<number, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    proceso?: import("mongoose").SchemaDefinitionProperty<string, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    cliente?: import("mongoose").SchemaDefinitionProperty<{
        equipo: string;
        razonsocial?: string;
        correo?: string;
        telefono?: string;
        documento?: string;
        tipodocumento?: string;
    }, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    tiempo?: import("mongoose").SchemaDefinitionProperty<string, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    transaccion?: import("mongoose").SchemaDefinitionProperty<any[], Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    seguimiento?: import("mongoose").SchemaDefinitionProperty<any[], Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    envio?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    pago?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    articulos?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    atencion?: import("mongoose").SchemaDefinitionProperty<number, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    estado?: import("mongoose").SchemaDefinitionProperty<number, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    estados?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    finished?: import("mongoose").SchemaDefinitionProperty<string, Cart, Document<unknown, {}, Cart, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Cart & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, Cart>;
