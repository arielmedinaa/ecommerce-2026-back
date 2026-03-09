import { Module, Global } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PrismaClient,
      useFactory: async (configService: ConfigService) => {
        const mongoUrl = configService.get<string>('MONGO_URL');

        if (!mongoUrl) {
          throw new Error('MONGO_URL is not defined in environment variables');
        }

        console.log('Conectando a MongoDB con Prisma');
        
        const prisma = new PrismaClient({
          datasources: {
            db: {
              url: mongoUrl,
            },
          },
          log: ['query', 'info', 'warn', 'error'],
        } as any);

        await prisma.$connect();
        console.log('Conexion a MongoDB con Prisma');

        return prisma;
      },
      inject: [ConfigService],
    },
  ],
  exports: [PrismaClient],
})
export class PrismaModule {}
