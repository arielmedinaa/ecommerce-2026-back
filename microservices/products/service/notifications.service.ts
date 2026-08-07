import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../schemas/notification.schema';

export interface CreateNotificationDto {
  tipo: string;
  destinatarioTipo: 'admin' | 'provider';
  idProveedor?: number | null;
  titulo: string;
  mensaje: string;
  payload?: Record<string, any> | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      tipo: dto.tipo,
      destinatario_tipo: dto.destinatarioTipo,
      id_proveedor: dto.idProveedor ?? null,
      titulo: dto.titulo,
      mensaje: dto.mensaje,
      payload: dto.payload ?? null,
    });
    return this.notificationRepository.save(notification);
  }

  async list(
    destinatarioTipo: 'admin' | 'provider',
    idProveedor?: number | null,
  ): Promise<Notification[]> {
    const qb = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.destinatario_tipo = :destinatarioTipo', { destinatarioTipo });

    if (destinatarioTipo === 'provider') {
      qb.andWhere('n.id_proveedor = :idProveedor', { idProveedor });
    }

    return qb.orderBy('n.created_at', 'DESC').take(50).getMany();
  }

  async markRead(id: number): Promise<void> {
    await this.notificationRepository.update(id, { leido: true });
  }

  async markAllRead(
    destinatarioTipo: 'admin' | 'provider',
    idProveedor?: number | null,
  ): Promise<void> {
    const qb = this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ leido: true })
      .where('destinatario_tipo = :destinatarioTipo', { destinatarioTipo });

    if (destinatarioTipo === 'provider') {
      qb.andWhere('id_proveedor = :idProveedor', { idProveedor });
    }

    await qb.execute();
  }
}
