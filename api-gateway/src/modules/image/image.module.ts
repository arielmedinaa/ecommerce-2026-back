import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { ImageController } from './controller/image.controller';

@Module({
  imports: [
    JwtModule,
    ClientsModule.register([
      {
        name: 'IMAGE_SERVICE',
        transport: Transport.TCP,
        options: {
          host:
            process.env.IMAGE_SERVICE_HOST ||
            process.env.IMAGE_SERVICE_URL ||
            'localhost',
          port: parseInt(process.env.IMAGE_SERVICE_PORT || process.env.IMAGE_PORT || '3107'),
        },
      },
    ]),
  ],
  controllers: [ImageController],
  exports: [],
})
export class ImageModule {}
