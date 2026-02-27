import { Document } from 'mongoose';
export type CombosDocument = Combos & Document;
export declare class Combos {
    codigo: string;
    codigoBarra: string;
    marca: Record<string, any>;
    modelo: string;
    nombre: string;
    ruta: string;
    descripcion: string;
    venta: number;
    ventaCredito: any[];
    costo: number;
    precio: number;
    cantidad: number;
    descuento: number;
    categorias: any[];
    subcategorias: any[];
    caracteristicas: any[];
    clasificaciones: any[];
    relaciones: any[];
    ofertas: any[];
    promos: any[];
    proveedores: any[];
    imagenes: string[];
    sello: string;
    dias_ultimo_movimiento: number;
    web: number;
    websc: number;
    prioridad: number;
    orden: number;
    tipo: number;
    estado: number;
    deposito: string;
}
export declare const CombosSchema: import("mongoose").Schema<Combos, import("mongoose").Model<Combos, any, any, any, Document<unknown, any, Combos, any, import("mongoose").DefaultSchemaOptions> & Combos & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any, Combos>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Combos, Document<unknown, {}, Combos, {
    id: string;
}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    codigo?: import("mongoose").SchemaDefinitionProperty<string, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    codigoBarra?: import("mongoose").SchemaDefinitionProperty<string, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    marca?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    modelo?: import("mongoose").SchemaDefinitionProperty<string, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    nombre?: import("mongoose").SchemaDefinitionProperty<string, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    ruta?: import("mongoose").SchemaDefinitionProperty<string, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    descripcion?: import("mongoose").SchemaDefinitionProperty<string, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    venta?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    ventaCredito?: import("mongoose").SchemaDefinitionProperty<any[], Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    costo?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    precio?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    cantidad?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    descuento?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    categorias?: import("mongoose").SchemaDefinitionProperty<any[], Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    subcategorias?: import("mongoose").SchemaDefinitionProperty<any[], Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    caracteristicas?: import("mongoose").SchemaDefinitionProperty<any[], Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    clasificaciones?: import("mongoose").SchemaDefinitionProperty<any[], Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    relaciones?: import("mongoose").SchemaDefinitionProperty<any[], Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    ofertas?: import("mongoose").SchemaDefinitionProperty<any[], Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    promos?: import("mongoose").SchemaDefinitionProperty<any[], Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    proveedores?: import("mongoose").SchemaDefinitionProperty<any[], Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    imagenes?: import("mongoose").SchemaDefinitionProperty<string[], Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    sello?: import("mongoose").SchemaDefinitionProperty<string, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    dias_ultimo_movimiento?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    web?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    websc?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    prioridad?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    orden?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    tipo?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    estado?: import("mongoose").SchemaDefinitionProperty<number, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    deposito?: import("mongoose").SchemaDefinitionProperty<string, Combos, Document<unknown, {}, Combos, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Combos & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, Combos>;
