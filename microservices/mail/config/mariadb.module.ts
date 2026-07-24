import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@auth/schemas/user.schemas';

@Module({})
export class MariaDbModule {
  static forAuthRead(): DynamicModule {
    return TypeOrmModule.forRootAsync({
      name: 'AUTH_READ_CONNECTION',
      useFactory: () => ({
        type: 'mysql',
        host: process.env.AUTH_DB_HOST || process.env.DATABASE_HOST_REPLIC,
        port: Number(process.env.AUTH_DB_PORT || process.env.DATABASE_PORT_REPLIC),
        username: process.env.AUTH_DB_USER || process.env.DATABASE_USER_REPLIC,
        password: process.env.AUTH_DB_PASSWORD || process.env.DATABASE_PASSWORD_REPLIC,
        database: process.env.AUTH_DB_NAME || 'auth_db',
        entities: [User],
        synchronize: false,
        logging: process.env.SYNCRONICE === 'true',
        keepConnectionAlive: true,
        retryAttempts: Number(process.env.DB_RETRY_ATTEMPTS || 10),
        retryDelay: Number(process.env.DB_RETRY_DELAY_MS || 3000),
        extra: {
          connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
        },
      }),
    });
  }

  static forFeatureAuthRead(): DynamicModule {
    return TypeOrmModule.forFeature([User], 'AUTH_READ_CONNECTION');
  }
}
