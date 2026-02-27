import { DynamicModule } from '@nestjs/common';
export interface DatabaseModuleOptions {
    envFilePath?: string | string[];
    load?: any[];
}
export declare class DatabaseModule {
    static forRoot(options?: DatabaseModuleOptions): DynamicModule;
}
