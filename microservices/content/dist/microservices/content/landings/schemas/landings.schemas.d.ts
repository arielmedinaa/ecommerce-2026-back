export declare class Landing {
    id: number;
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
    createdAt: Date;
    updatedAt: Date;
}
