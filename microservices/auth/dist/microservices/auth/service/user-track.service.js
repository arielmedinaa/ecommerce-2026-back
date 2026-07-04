"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UserTrackService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserTrackService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_track_schema_1 = require("../schemas/user-track.schema");
const RETENTION_DAYS = 30;
const FLUSH_MS = 5000;
const FLUSH_MAX = 200;
const CLEANUP_MS = 6 * 60 * 60 * 1000;
let UserTrackService = UserTrackService_1 = class UserTrackService {
    constructor(repo) {
        this.repo = repo;
        this.logger = new common_1.Logger(UserTrackService_1.name);
        this.buffer = [];
        this.flushTimer = null;
        this.cleanupTimer = null;
    }
    onModuleInit() {
        this.flushTimer = setInterval(() => {
            this.flush().catch((e) => this.logger.warn(`flush falló: ${e?.message ?? e}`));
        }, FLUSH_MS);
        this.cleanupTimer = setInterval(() => {
            this.cleanupOld().catch((e) => this.logger.warn(`cleanup falló: ${e?.message ?? e}`));
        }, CLEANUP_MS);
        setTimeout(() => this.cleanupOld().catch(() => undefined), 30_000);
    }
    async onModuleDestroy() {
        if (this.flushTimer)
            clearInterval(this.flushTimer);
        if (this.cleanupTimer)
            clearInterval(this.cleanupTimer);
        await this.flush().catch(() => undefined);
    }
    track(event) {
        const events = Array.isArray(event) ? event : [event];
        for (const e of events) {
            const userId = String(e?.userId ?? '').trim();
            if (!userId || !e?.tipo)
                continue;
            this.buffer.push({ userId: userId.slice(0, 64), tipo: e.tipo, metadata: e.metadata ?? {} });
        }
        if (this.buffer.length >= FLUSH_MAX) {
            this.flush().catch((err) => this.logger.warn(`flush falló: ${err?.message ?? err}`));
        }
    }
    async flush() {
        if (this.buffer.length === 0)
            return;
        const batch = this.buffer;
        this.buffer = [];
        try {
            await this.repo.insert(batch.map((e) => ({ userId: e.userId, tipo: e.tipo, metadata: e.metadata })));
        }
        catch (e) {
            this.logger.warn(`No se pudo insertar lote de tracking (${batch.length}): ${e?.message ?? e}`);
        }
    }
    async cleanupOld() {
        const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const res = await this.repo.delete({ createdAt: (0, typeorm_2.LessThan)(cutoff) });
        if (res.affected)
            this.logger.log(`Tracking: purgados ${res.affected} eventos > ${RETENTION_DAYS} días`);
    }
    async getUserTrack(userId) {
        const uid = String(userId ?? '').trim();
        if (!uid)
            return this.emptySummary();
        await this.flush().catch(() => undefined);
        const since = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const rows = await this.repo
            .createQueryBuilder('t')
            .where('t.userId = :uid', { uid })
            .andWhere('t.createdAt >= :since', { since })
            .orderBy('t.createdAt', 'DESC')
            .limit(5000)
            .getMany();
        if (rows.length === 0)
            return this.emptySummary();
        const byTipo = {};
        const linkCounts = new Map();
        const promoCounts = new Map();
        const ofertaCounts = new Map();
        const familiaCounts = new Map();
        let logins = 0;
        let jotaVisits = 0;
        const cartHistory = [];
        for (const r of rows) {
            byTipo[r.tipo] = (byTipo[r.tipo] || 0) + 1;
            const m = (r.metadata || {});
            switch (r.tipo) {
                case 'LOGIN':
                    logins++;
                    break;
                case 'LINK_VISIT':
                case 'PAGE_VISIT': {
                    const href = String(m?.href || '').trim();
                    if (href)
                        linkCounts.set(href, (linkCounts.get(href) || 0) + 1);
                    if (/\/jota/i.test(href))
                        jotaVisits++;
                    break;
                }
                case 'PROMO_VIEW': {
                    const k = String(m?.promoId ?? m?.nombre ?? '').trim();
                    if (k)
                        promoCounts.set(k, (promoCounts.get(k) || 0) + 1);
                    break;
                }
                case 'OFERTA_VIEW': {
                    const k = String(m?.ofertaId ?? m?.titulo ?? '').trim();
                    if (k)
                        ofertaCounts.set(k, (ofertaCounts.get(k) || 0) + 1);
                    break;
                }
                case 'PRODUCT_VIEW': {
                    const k = String(m?.tipoProducto ?? m?.familiaNombre ?? m?.familiaId ?? '').trim();
                    if (k)
                        familiaCounts.set(k, (familiaCounts.get(k) || 0) + 1);
                    break;
                }
                case 'CART':
                    if (cartHistory.length < 50)
                        cartHistory.push({ at: r.createdAt, ...m });
                    break;
            }
        }
        const topN = (map, n = 8) => [...map.entries()]
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
    emptySummary() {
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
};
exports.UserTrackService = UserTrackService;
exports.UserTrackService = UserTrackService = UserTrackService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_track_schema_1.UserTrack)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object])
], UserTrackService);
//# sourceMappingURL=user-track.service.js.map