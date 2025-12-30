import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { CartController } from './controllers/cart.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';

@Module({
  imports: [
    MicroserviceModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  controllers: [CartController],
  providers: [
    JwtService,
    {
      provide: 'JwtAuthGuard',
      useClass: JwtAuthGuard,
    },
  ],
  exports: [JwtModule, JwtAuthGuard],
})
export class CartModule {}