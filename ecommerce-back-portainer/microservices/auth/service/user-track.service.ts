import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { UserTrack, UserTrackTipo } from '../schemas/user-track.schema';

export interface TrackEventInput {
  userId: string;
  tipo: UserTrackTipo;
  metadata?: Record<string, any>;
}

const RETENTION_DAYS = 30;
const FLUSH_MS = 5000; 
const FLUSH_MAX = 200; 
const CLEANUP_MS = 6 * 60 * 60 * 1000; 

@Injectable()
export class UserTrackService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UserTrackService.name);
  private buffer: TrackEventInput[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(UserTrack)
    private readonly repo: Repository<UserTrack>,
  ) {}

  onModuleInit(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((e) => this.logger.warn(`flush falló: ${e?.message ?? e}`));
    }, FLUSH_MS);
    this.cleanupTimer = setInterval(() => {
      this.cleanupOld().catch((e) => this.logger.warn(`cleanup falló: ${e?.message ?? e}`));
    }, CLEANUP_MS);
    
    setTimeout(() => this.cleanupOld().catch(() => undefined), 30_000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    await this.flush().catch(() => undefined);
  }

  track(event: TrackEventInput | TrackEventInput[]): void {
    const events = Array.isArray(event) ? event : [event];
    for (const e of events) {
      const userId = String(e?.userId ?? '').trim();
      if (!userId || !e?.tipo) continue;
      this.buffer.push({ userId: userId.slice(0, 64), tipo: e.tipo, metadata: e.metadata ?? {} });
    }
    if (this.buffer.length >= FLUSH_MAX) {
      this.flush().catch((err) => this.logger.warn(`flush falló: ${err?.message ?? err}`));
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer;
    this.buffer = [];
    try {
      await this.repo.insert(batch.map((e) => ({ userId: e.userId, tipo: e.tipo, metadata: e.metadata })));
    } catch (e) {
      this.logger.warn(`No se pudo insertar lote de tracking (${batch.length}): ${(e as any)?.message ?? e}`);
    }
  }

  private async cleanupOld(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const res = await this.repo.delete({ createdAt: LessThan(cutoff) });
    if (res.affected) this.logger.log(`Tracking: purgados ${res.affected} eventos > ${RETENTION_DAYS} días`);
  }

  async getUserTrack(userId: string): Promise<any> {
    const uid = String(userId ?? '').trim();
    if (!uid) return this.emptySummary();
    
    await this.flush().catch(() => undefined);

    const since = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const rows = await this.repo
      .createQueryBuilder('t')
      .where('t.userId = :uid', { uid })
      .andWhere('t.createdAt >= :since', { since })
      .orderBy('t.createdAt', 'DESC')
      .limit(5000)
      .getMany();

    if (rows.length === 0) return this.emptySummary();

    const byTipo: Record<string, number> = {};
    const linkCounts = new Map<string, number>();
    const promoCounts = new Map<string, number>();
    const ofertaCounts = new Map<string, number>();
    const familiaCounts = new Map<string, number>();
    let logins = 0;
    let jotaVisits = 0;
    const cartHistory: any[] = [];

    for (const r of rows) {
      byTipo[r.tipo] = (byTipo[r.tipo] || 0) + 1;
      const m = (r.metadata || {}) as any;
      switch (r.tipo) {
        case 'LOGIN':
          logins++;
          break;
        case 'LINK_VISIT':
        case 'PAGE_VISIT': {
          const href = String(m?.href || '').trim();
          if (href) linkCounts.set(href, (linkCounts.get(href) || 0) + 1);
          if (/\/jota/i.test(href)) jotaVisits++;
          break;
        }
        case 'PROMO_VIEW': {
          const k = String(m?.promoId ?? m?.nombre ?? '').trim();
          if (k) promoCounts.set(k, (promoCounts.get(k) || 0) + 1);
          break;
        }
        case 'OFERTA_VIEW': {
          const k = String(m?.ofertaId ?? m?.titulo ?? '').trim();
          if (k) ofertaCounts.set(k, (ofertaCounts.get(k) || 0) + 1);
          break;
        }
        case 'PRODUCT_VIEW': {
          const k = String(m?.tipoProducto ?? m?.familiaNombre ?? m?.familiaId ?? '').trim();
          if (k) familiaCounts.set(k, (familiaCounts.get(k) || 0) + 1);
          break;
        }
        case 'CART':
          if (cartHistory.length < 50) cartHistory.push({ at: r.createdAt, ...m });
          break;
      }
    }

    const topN = (map: Map<string, number>, n = 8) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([label, count]) => ({ label, count }));

    return {
      totalEventos: rows.length,
      desde: since,
      porTipo: byTipo,
      logins,
      jotaVisitas: jotaVisits,
      linksTop: topN(linkCounts),
      promosTop: topN(promoCounts),
      ofertasTop: topN(ofertaCounts),
      tipoProductoPreferido: topN(familiaCounts),
      historialCarritos: cartHistory,
    };
  }

  private emptySummary() {
    return {
      totalEventos: 0,
      desde: new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000),
      porTipo: {},
      logins: 0,
      jotaVisitas: 0,
      linksTop: [],
      promosTop: [],
      ofertasTop: [],
      tipoProductoPreferido: [],
      historialCarritos: [],
    };
  }
}
