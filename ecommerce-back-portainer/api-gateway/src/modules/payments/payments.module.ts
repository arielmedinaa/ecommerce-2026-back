import { Module } from '@nestjs/common';
import { PaymentsController } from './controllers/payments.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    MicroserviceModule.register('PAYMENTS_SERVICE'),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [PaymentsController],
  providers: [JwtModule],
  exports: [],
})
export class PaymentsModule {}
