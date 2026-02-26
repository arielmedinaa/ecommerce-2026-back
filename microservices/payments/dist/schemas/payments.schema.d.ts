import { Document, Types } from 'mongoose';
export type PaymentsDocument = Payments & Document;
export declare class Payments {
    createdAt: Date;
    updatedAt: Date;
    codigoCarrito: number;
    carrito: Record<string, any>;
    estado: string;
    metodoPago: string;
    monto: number;
    moneda: string;
    respuestaPagopar: {
        idPago?: string;
        estado?: string;
        urlProceso?: string;
        codigoQr?: string;
        fechaExpiracion?: string;
        respuesta?: any;
    };
    respuestaBancard: {
        idPago?: string;
        estado?: string;
        codigoAutorizacion?: string;
        numeroTicket?: string;
        respuesta?: any;
    };
    idTransaccion: string;
    descripcion: string;
    cliente: {
        equipo: string;
        nombre: string;
        email: string;
        telefono?: string;
        documento: string;
        nroDocumento: string;
    };
    metadatos: Record<string, any>;
    finalizado: Date;
    motivoFallo: string;
    intentosReintentar: number;
    proximoReintento: Date;
    reembolsos: Array<{
        monto: number;
        motivo: string;
        fecha: Date;
        estado: string;
        idReembolso?: string;
    }>;
    procesado: Date;
    expira: Date;
}
export declare const PaymentsSchema: import("mongoose").Schema<Payments, import("mongoose").Model<Payments, any, any, any, Document<unknown, any, Payments, any, import("mongoose").DefaultSchemaOptions> & Payments & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any, Payments>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Payments, Document<unknown, {}, Payments, {
    id: string;
}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    createdAt?: import("mongoose").SchemaDefinitionProperty<Date, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    updatedAt?: import("mongoose").SchemaDefinitionProperty<Date, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    codigoCarrito?: import("mongoose").SchemaDefinitionProperty<number, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    carrito?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    estado?: import("mongoose").SchemaDefinitionProperty<string, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    metodoPago?: import("mongoose").SchemaDefinitionProperty<string, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    monto?: import("mongoose").SchemaDefinitionProperty<number, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    moneda?: import("mongoose").SchemaDefinitionProperty<string, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    respuestaPagopar?: import("mongoose").SchemaDefinitionProperty<{
        idPago?: string;
        estado?: string;
        urlProceso?: string;
        codigoQr?: string;
        fechaExpiracion?: string;
        respuesta?: any;
    }, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    respuestaBancard?: import("mongoose").SchemaDefinitionProperty<{
        idPago?: string;
        estado?: string;
        codigoAutorizacion?: string;
        numeroTicket?: string;
        respuesta?: any;
    }, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    idTransaccion?: import("mongoose").SchemaDefinitionProperty<string, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    descripcion?: import("mongoose").SchemaDefinitionProperty<string, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    cliente?: import("mongoose").SchemaDefinitionProperty<{
        equipo: string;
        nombre: string;
        email: string;
        telefono?: string;
        documento: string;
        nroDocumento: string;
    }, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    metadatos?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    finalizado?: import("mongoose").SchemaDefinitionProperty<Date, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    motivoFallo?: import("mongoose").SchemaDefinitionProperty<string, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    intentosReintentar?: import("mongoose").SchemaDefinitionProperty<number, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    proximoReintento?: import("mongoose").SchemaDefinitionProperty<Date, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    reembolsos?: import("mongoose").SchemaDefinitionProperty<{
        monto: number;
        motivo: string;
        fecha: Date;
        estado: string;
        idReembolso?: string;
    }[], Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    procesado?: import("mongoose").SchemaDefinitionProperty<Date, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    expira?: import("mongoose").SchemaDefinitionProperty<Date, Payments, Document<unknown, {}, Payments, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Payments & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, Payments>;
