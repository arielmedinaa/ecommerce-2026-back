import { Types, Document } from 'mongoose';
export type LandingDocument = Landing & Document;
export declare class Landing {
    title: string;
    slug: string;
    content: string;
    createdBy: string;
    updatedBy?: string;
    isActive: boolean;
    isPublished: boolean;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    viewCount: number;
    tags: string[];
    customStyles?: Record<string, any>;
    customScripts?: Record<string, any>;
    publicadoEn?: Date;
    expiraEn?: Date;
    tituloRelacionado: string;
}
export declare const LandingSchema: import("mongoose").Schema<Landing, import("mongoose").Model<Landing, any, any, any, Document<unknown, any, Landing, any, import("mongoose").DefaultSchemaOptions> & Landing & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any, Landing>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Landing, Document<unknown, {}, Landing, {
    id: string;
}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    title?: import("mongoose").SchemaDefinitionProperty<string, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    slug?: import("mongoose").SchemaDefinitionProperty<string, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    content?: import("mongoose").SchemaDefinitionProperty<string, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    createdBy?: import("mongoose").SchemaDefinitionProperty<string, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    updatedBy?: import("mongoose").SchemaDefinitionProperty<string, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    isPublished?: import("mongoose").SchemaDefinitionProperty<boolean, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    description?: import("mongoose").SchemaDefinitionProperty<string, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    metaTitle?: import("mongoose").SchemaDefinitionProperty<string, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    metaDescription?: import("mongoose").SchemaDefinitionProperty<string, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    metaKeywords?: import("mongoose").SchemaDefinitionProperty<string[], Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    viewCount?: import("mongoose").SchemaDefinitionProperty<number, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    tags?: import("mongoose").SchemaDefinitionProperty<string[], Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    customStyles?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    customScripts?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    publicadoEn?: import("mongoose").SchemaDefinitionProperty<Date, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    expiraEn?: import("mongoose").SchemaDefinitionProperty<Date, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    tituloRelacionado?: import("mongoose").SchemaDefinitionProperty<string, Landing, Document<unknown, {}, Landing, {
        id: string;
    }, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & Omit<Landing & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, Landing>;
