declare class ProductoOferta {
    nombre: string;
    codigo: string;
    tiempoActivo: number;
    descuento: number;
    precioContado: number;
    precioCredito: number;
    cuotas: Array<{
        cantidad: number;
        valor: number;
    }>;
    activo: boolean;
    prioridad: number;
}
export declare class Ofertas {
    productos: ProductoOferta[];
    tiempoActivo: number;
    activo: boolean;
}
export declare const OfertasSchema: import("mongoose").Schema<Ofertas, import("mongoose").Model<Ofertas, any, any, any, import("mongoose").Document<unknown, any, Ofertas, any, import("mongoose").DefaultSchemaOptions> & Ofertas & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any, Ofertas>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Ofertas, import("mongoose").Document<unknown, {}, Ofertas, {
    id: string;
}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Ofertas & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    productos?: import("mongoose").SchemaDefinitionProperty<ProductoOferta[], Ofertas, import("mongoose").Document<unknown, {}, Ofertas, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Ofertas & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    tiempoActivo?: import("mongoose").SchemaDefinitionProperty<number, Ofertas, import("mongoose").Document<unknown, {}, Ofertas, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Ofertas & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    activo?: import("mongoose").SchemaDefinitionProperty<boolean, Ofertas, import("mongoose").Document<unknown, {}, Ofertas, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Ofertas & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, Ofertas>;
export {};
