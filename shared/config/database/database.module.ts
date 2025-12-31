import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

export interface DatabaseModuleOptions {
  envFilePath?: string | string[];
  load?: any[];
}

@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseModuleOptions = {}): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: options.envFilePath,
          load: options.load,
        }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => {
            const uri = configService.get<string>('MONGO_URL');
            if (!uri) {
              throw new Error('MONGO_URL is not defined in environment variables');
            }
            console.log('Connecting to MongoDB...');
            return {
              uri,
              retryWrites: true,
              w: 'majority',
              maxPoolSize: 10,
              serverSelectionTimeoutMS: 5000,
            };
          },
          inject: [ConfigService],
        }),
      ],
      exports: [MongooseModule],
    };
  }
}
