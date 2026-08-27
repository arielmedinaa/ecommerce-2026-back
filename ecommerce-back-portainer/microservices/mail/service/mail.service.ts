import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@auth/schemas/user.schemas';
import { MailTransportService } from './mail-transport.service';
import { formatGs, renderItemsRows, renderTemplate } from './template-renderer';

export interface OrderConfirmationPayload {
  correo: string;
  nombre: string;
  codigo: string;
  items: { nombre: string; cantidad: number; precio: number }[];
  total: number;
  trackingUrl: string;
}

export interface AbandonedCartPayload {
  correo: string;
  nombre: string;
  codigo: string;
  items: { nombre: string; cantidad: number; precio: number }[];
  total: number;
  recoverUrl: string;
}

export interface PromoNotificationPayload {
  titulo: string;
  bannerImageUrl: string;
  link: string;
}

export interface ContactEmailPayload {
  to: string;
  subject: string;
  mensaje: string;
  deNombre?: string;
}

const PROMO_BATCH_SIZE = 20;
const PROMO_BATCH_DELAY_MS = 2000;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly transport: MailTransportService,
    @InjectRepository(User, 'AUTH_READ_CONNECTION')
    private readonly userReadRepository: Repository<User>,
  ) {}

  async sendOrderConfirmation(payload: OrderConfirmationPayload): Promise<{ success: boolean }> {
    const html = renderTemplate(
      'order-confirmation',
      {
        nombre: payload.nombre || 'cliente',
        codigo: payload.codigo || '',
        itemsRows: renderItemsRows(payload.items || []),
        total: formatGs(payload.total),
        trackingUrl: payload.trackingUrl,
      },
      'Confirmación de tu pedido',
    );
    const success = await this.transport.send(payload.correo, 'Confirmamos tu pedido', html);
    return { success };
  }

  async sendAbandonedCart(payload: AbandonedCartPayload): Promise<{ success: boolean }> {
    const html = renderTemplate(
      'abandoned-cart',
      {
        nombre: payload.nombre || 'cliente',
        codigo: payload.codigo || '',
        itemsRows: renderItemsRows(payload.items || []),
        recoverUrl: payload.recoverUrl,
      },
      'Tu carrito te espera',
    );
    const success = await this.transport.send(payload.correo, 'Tu carrito te espera', html);
    return { success };
  }

  async sendContactEmail(payload: ContactEmailPayload): Promise<{ success: boolean }> {
    const html = renderTemplate(
      'contact-email',
      {
        mensaje: payload.mensaje,
        deNombre: payload.deNombre || 'Central Shop',
      },
      payload.subject,
    );
    const success = await this.transport.send(payload.to, payload.subject, html);
    return { success };
  }

  async sendPromoNotification(payload: PromoNotificationPayload): Promise<{ success: boolean; total: number }> {
    const html = renderTemplate(
      'promo-notification',
      {
        titulo: payload.titulo || 'Nueva promoción',
        bannerImageUrl: payload.bannerImageUrl,
        link: payload.link,
      },
      payload.titulo || 'Nueva promoción',
    );

    const usuarios = await this.userReadRepository.find({
      where: { estaActivo: true, esInvitado: false },
      select: { email: true },
    });
    const destinatarios = usuarios.map((u) => u.email).filter(Boolean);
    this.logger.log(`Enviando notificación de promo a ${destinatarios.length} clientes registrados`);

    let enviados = 0;
    for (let i = 0; i < destinatarios.length; i += PROMO_BATCH_SIZE) {
      const lote = destinatarios.slice(i, i + PROMO_BATCH_SIZE);
      const resultados = await Promise.all(
        lote.map((correo) => this.transport.send(correo, payload.titulo || 'Nueva promoción', html)),
      );
      enviados += resultados.filter(Boolean).length;
      if (i + PROMO_BATCH_SIZE < destinatarios.length) {
        await new Promise((resolve) => setTimeout(resolve, PROMO_BATCH_DELAY_MS));
      }
    }

    this.logger.log(`Notificación de promo enviada a ${enviados}/${destinatarios.length} clientes`);
    return { success: true, total: enviados };
  }
}
