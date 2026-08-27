import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from '../../schemas/notifications/push-subscription.schema';

export type WebPushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly vapidConfigured: boolean;

  constructor(
    @InjectRepository(PushSubscription, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly pushRepository: Repository<PushSubscription>,
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@centralshop.com.py';

    this.vapidConfigured = !!(publicKey && privateKey);
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    } else {
      this.logger.warn('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas: push deshabilitado');
    }
  }

  getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  async saveSubscription(
    destinatarioTipo: 'admin' | 'provider',
    idProveedor: number | null,
    subscription: WebPushSubscriptionInput,
  ): Promise<{ success: boolean; message: string }> {
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return { success: false, message: 'Suscripción inválida' };
    }

    const existente = await this.pushRepository.findOne({ where: { endpoint: subscription.endpoint } });
    if (existente) {
      await this.pushRepository.update(existente.id, {
        destinatario_tipo: destinatarioTipo,
        id_proveedor: idProveedor,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
      return { success: true, message: 'Suscripción actualizada' };
    }

    await this.pushRepository.save(
      this.pushRepository.create({
        destinatario_tipo: destinatarioTipo,
        id_proveedor: idProveedor,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }),
    );
    return { success: true, message: 'Suscripción guardada' };
  }

  async removeSubscription(endpoint: string): Promise<{ success: boolean; message: string }> {
    if (!endpoint) return { success: false, message: 'Falta el endpoint' };
    await this.pushRepository.delete({ endpoint });
    return { success: true, message: 'Suscripción eliminada' };
  }

  async sendToDestinatario(
    destinatarioTipo: 'admin' | 'provider',
    idProveedor: number | null | undefined,
    payload: { titulo: string; mensaje: string; url?: string },
  ): Promise<void> {
    if (!this.vapidConfigured) return;

    const where: any = { destinatario_tipo: destinatarioTipo };
    if (destinatarioTipo === 'provider') where.id_proveedor = idProveedor;

    const subs = await this.pushRepository.find({ where });
    if (subs.length === 0) return;

    const body = JSON.stringify({ titulo: payload.titulo, mensaje: payload.mensaje, url: payload.url || '/' });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as any,
            body,
          );
        } catch (err: any) {
          const statusCode = err?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await this.pushRepository.delete(sub.id).catch(() => undefined);
          } else {
            this.logger.warn(`No se pudo enviar push a ${sub.endpoint.slice(0, 40)}...: ${err?.message || err}`);
          }
        }
      }),
    );
  }
}
