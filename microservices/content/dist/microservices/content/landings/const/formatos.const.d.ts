export declare const FORMATOS_TEMPLATES: {
    HERO_MODERNA: {
        name: string;
        slug: string;
        description: string;
        type: string;
        category: string;
        tags: string[];
        template: string;
        config: {
            customizableSections: string[];
            requiredProps: any[];
            defaultStyles: {};
            dependencies: string[];
        };
        variables: {
            name: string;
            type: string;
            description: string;
            required: boolean;
            defaultValue: string;
        }[];
    };
    PRODUCTO_FEATURES: {
        name: string;
        slug: string;
        description: string;
        type: string;
        category: string;
        tags: string[];
        template: string;
        config: {
            customizableSections: string[];
            requiredProps: any[];
            defaultStyles: {};
            dependencies: string[];
        };
        variables: ({
            name: string;
            type: string;
            description: string;
            required: boolean;
            defaultValue: string;
        } | {
            name: string;
            type: string;
            description: string;
            required: boolean;
            defaultValue?: undefined;
        })[];
    };
    SAAS_LANDING: {
        name: string;
        slug: string;
        description: string;
        type: string;
        category: string;
        tags: string[];
        template: string;
        config: {
            customizableSections: string[];
            requiredProps: any[];
            defaultStyles: {};
            dependencies: string[];
        };
        variables: ({
            name: string;
            type: string;
            description: string;
            required: boolean;
            defaultValue: string;
        } | {
            name: string;
            type: string;
            description: string;
            required: boolean;
            defaultValue?: undefined;
        })[];
    };
    MINIMALISTA: {
        name: string;
        slug: string;
        description: string;
        type: string;
        category: string;
        tags: string[];
        template: string;
        config: {
            customizableSections: string[];
            requiredProps: any[];
            defaultStyles: {};
            dependencies: string[];
        };
        variables: {
            name: string;
            type: string;
            description: string;
            required: boolean;
            defaultValue: string;
        }[];
    };
};
export default FORMATOS_TEMPLATES;
