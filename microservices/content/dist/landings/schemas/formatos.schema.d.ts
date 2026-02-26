import { Types, Document } from "mongoose";
export type FormatoDocument = Formato & Document;
export declare class Formato {
    name: string;
    slug: string;
    description: string;
    template: string;
    type: 'html' | 'react' | 'jsx';
    category: string;
    tags: string[];
    preview?: {
        thumbnail?: string;
        screenshot?: string;
        demoUrl?: string;
    };
    config?: {
        customizableSections?: string[];
        requiredProps?: string[];
        defaultStyles?: Record<string, any>;
        dependencies?: string[];
    };
    variables?: {
        name: string;
        type: string;
        description: string;
        required: boolean;
        defaultValue?: any;
    }[];
    isActive: boolean;
    isPremium: boolean;
    usageCount: number;
    createdBy: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    sortOrder: number;
    documentation?: string;
    metadata?: Record<string, any>;
}
export declare const FormatoSchema: import("mongoose").Schema<Formato, import("mongoose").Model<Formato, any, any, any, (Document<unknown, any, Formato, any, import("mongoose").DefaultSchemaOptions> & Formato & {
    _id: Types.ObjectId;
} & {
    __v: number;
} & {
    id: string;
}) | (Document<unknown, any, Formato, any, import("mongoose").DefaultSchemaOptions> & Formato & {
    _id: Types.ObjectId;
} & {
    __v: number;
}), any, Formato>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Formato, Document<unknown, {}, Formato, {
    id: string;
}, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    name?: import("mongoose").SchemaDefinitionProperty<string, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    slug?: import("mongoose").SchemaDefinitionProperty<string, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    description?: import("mongoose").SchemaDefinitionProperty<string, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    template?: import("mongoose").SchemaDefinitionProperty<string, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    type?: import("mongoose").SchemaDefinitionProperty<"react" | "html" | "jsx", Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    category?: import("mongoose").SchemaDefinitionProperty<string, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    tags?: import("mongoose").SchemaDefinitionProperty<string[], Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    preview?: import("mongoose").SchemaDefinitionProperty<{
        thumbnail?: string;
        screenshot?: string;
        demoUrl?: string;
    }, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    config?: import("mongoose").SchemaDefinitionProperty<{
        customizableSections?: string[];
        requiredProps?: string[];
        defaultStyles?: Record<string, any>;
        dependencies?: string[];
    }, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    variables?: import("mongoose").SchemaDefinitionProperty<{
        name: string;
        type: string;
        description: string;
        required: boolean;
        defaultValue?: any;
    }[], Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    isActive?: import("mongoose").SchemaDefinitionProperty<boolean, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    isPremium?: import("mongoose").SchemaDefinitionProperty<boolean, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    usageCount?: import("mongoose").SchemaDefinitionProperty<number, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    createdBy?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    updatedBy?: import("mongoose").SchemaDefinitionProperty<Types.ObjectId, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    sortOrder?: import("mongoose").SchemaDefinitionProperty<number, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    documentation?: import("mongoose").SchemaDefinitionProperty<string, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
    metadata?: import("mongoose").SchemaDefinitionProperty<Record<string, any>, Formato, Document<unknown, {}, Formato, {
        id: string;
    }, import("mongoose").DefaultSchemaOptions> & Omit<Formato & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }>;
}, Formato>;
