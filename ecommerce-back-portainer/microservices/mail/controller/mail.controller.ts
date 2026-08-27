import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  MailService,
  OrderConfirmationPayload,
  AbandonedCartPayload,
  PromoNotificationPayload,
  ContactEmailPayload,
} from '@mail/service/mail.service';

@Controller()
export class MailController {
  private readonly logger = new Logger(MailController.name);

  constructor(private readonly mailService: MailService) {}

  @MessagePattern({ cmd: 'send_order_confirmation' })
  async sendOrderConfirmation(@Payload() payload: OrderConfirmationPayload) {
    try {
      return await this.mailService.sendOrderConfirmation(payload);
    } catch (error) {
      this.logger.error('Error in send_order_confirmation:', error);
      return { success: false };
    }
  }

  @MessagePattern({ cmd: 'send_abandoned_cart' })
  async sendAbandonedCart(@Payload() payload: AbandonedCartPayload) {
    try {
      return await this.mailService.sendAbandonedCart(payload);
    } catch (error) {
      this.logger.error('Error in send_abandoned_cart:', error);
      return { success: false };
    }
  }

  @MessagePattern({ cmd: 'send_promo_notification' })
  async sendPromoNotification(@Payload() payload: PromoNotificationPayload) {
    try {
      return await this.mailService.sendPromoNotification(payload);
    } catch (error) {
      this.logger.error('Error in send_promo_notification:', error);
      return { success: false, total: 0 };
    }
  }

  @MessagePattern({ cmd: 'send_contact_email' })
  async sendContactEmail(@Payload() payload: ContactEmailPayload) {
    try {
      return await this.mailService.sendContactEmail(payload);
    } catch (error) {
      this.logger.error('Error in send_contact_email:', error);
      return { success: false };
    }
  }
}
