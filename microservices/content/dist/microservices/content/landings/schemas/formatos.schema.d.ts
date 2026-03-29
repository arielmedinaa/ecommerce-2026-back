export declare class Formato {
    id: string;
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
    createdBy: string;
    updatedBy?: string;
    sortOrder: number;
    documentation?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
