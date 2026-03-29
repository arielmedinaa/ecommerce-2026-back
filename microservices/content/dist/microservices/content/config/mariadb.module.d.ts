import { DynamicModule } from '@nestjs/common';
export declare class MariaDbModule {
    static forWrite(): DynamicModule;
    static forRead(): DynamicModule;
    static forFeature(): DynamicModule;
    static forFeatureRead(): DynamicModule;
}
