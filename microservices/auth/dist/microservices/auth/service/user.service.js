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
var UserService_1;
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const user_schemas_1 = require("../schemas/user.schemas");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let UserService = UserService_1 = class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
        this.logger = new common_1.Logger(UserService_1.name);
        this.emailCodes = new Map();
    }
    async findUserByEmail(email, excludeUserId) {
        const e = String(email || '').trim();
        if (!e)
            return { exists: false };
        const u = await this.userRepository.findOne({ where: { email: e } });
        if (!u || (excludeUserId && u.id === Number(excludeUserId)))
            return { exists: false };
        return { exists: true, userId: u.id, nombre: u.nombre };
    }
    async sendEmailCode(email) {
        const e = String(email || '').trim().toLowerCase();
        if (!e)
            return { success: false, message: 'EMAIL REQUERIDO' };
        const code = String(Math.floor(100000 + Math.random() * 900000));
        this.emailCodes.set(e, { code, exp: Date.now() + 10 * 60 * 1000 });
        this.logger.log(`[email-code] (simulado) -> ${e}: ${code}`);
        return {
            success: true,
            message: 'CÓDIGO ENVIADO',
            devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
        };
    }
    verifyEmailCode(email, code) {
        const e = String(email || '').trim().toLowerCase();
        const rec = this.emailCodes.get(e);
        if (!rec)
            return { valid: false, message: 'NO HAY CÓDIGO PARA ESTE EMAIL' };
        if (Date.now() > rec.exp) {
            this.emailCodes.delete(e);
            return { valid: false, message: 'CÓDIGO EXPIRADO' };
        }
        if (String(code).trim() !== rec.code)
            return { valid: false, message: 'CÓDIGO INCORRECTO' };
        this.emailCodes.delete(e);
        return { valid: true, message: 'CÓDIGO VÁLIDO' };
    }
    async getAllUsers(filters) {
        const result = await this.userRepository.query('CALL sp_obtener_datos_usuario(?);', [filters.usuarioId || null]);
        const dbFilter = {};
        if (filters.id)
            dbFilter.id = filters.id;
        if (filters.email)
            dbFilter.email = filters.email;
        if (filters.nombre)
            dbFilter.nombre = filters.nombre;
        if (filters.perfil)
            dbFilter.perfil = filters.perfil;
        if (filters.estaActivo !== undefined)
            dbFilter.estaActivo = filters.estaActivo;
        dbFilter.perfil = 'cliente';
        const [data, total] = await this.userRepository.findAndCount({
            where: dbFilter,
        });
        if (!data) {
            return {
                data: [],
                total: 0,
                message: 'NO SE ENCONTRARON USUARIOS',
                success: false,
                prefetch: [],
            };
        }
        return {
            data,
            total,
            message: 'USUARIOS RECUPERADOS EXISTOSAMENTE',
            success: true,
            prefetch: result
        };
    }
    async searchUsers(filters) {
        const [data, total] = await this.userRepository.findAndCount({
            where: filters,
        });
        if (!data) {
            return {
                data: [],
                total: 0,
                message: 'NO SE ENCONTRARON USUARIOS',
                success: false,
            };
        }
        return {
            data,
            total,
            message: 'USUARIOS RECUPERADOS EXISTOSAMENTE',
            success: true,
        };
    }
    async listClientes(params = {}) {
        const page = Math.max(1, Number(params.page) || 1);
        const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
        const search = String(params.search ?? '').trim();
        const sort = ['fechaCreacion', 'nombre', 'email', 'ultimoInicioSesion'].includes(params.sort)
            ? params.sort
            : 'fechaCreacion';
        const order = String(params.order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        const qb = this.construirQueryClientes(params);
        if (!qb) {
            return { data: [], total: 0, page, pageSize, message: 'SIN COINCIDENCIAS', success: true };
        }
        const [data, total] = await qb
            .orderBy(`u.${sort}`, order)
            .skip((page - 1) * pageSize)
            .take(pageSize)
            .getManyAndCount();
        return {
            data: data || [],
            total: total || 0,
            page,
            pageSize,
            message: 'CLIENTES RECUPERADOS',
            success: true,
        };
    }
    construirQueryClientes(params = {}) {
        const qb = this.userRepository
            .createQueryBuilder('u')
            .where('u.perfil = :perfil', { perfil: 'cliente' });
        if (params.estaActivo !== undefined && params.estaActivo !== null && params.estaActivo !== '') {
            qb.andWhere('u.estaActivo = :activo', { activo: params.estaActivo === true || params.estaActivo === 'true' || params.estaActivo === 1 || params.estaActivo === '1' });
        }
        if (params.esInvitado !== undefined && params.esInvitado !== null && params.esInvitado !== '') {
            qb.andWhere('u.esInvitado = :inv', { inv: params.esInvitado === true || params.esInvitado === 'true' });
        }
        const dias = Number(params.dias);
        if (Number.isFinite(dias) && dias > 0) {
            qb.andWhere('u.fechaCreacion >= DATE_SUB(NOW(), INTERVAL :dias DAY)', { dias });
        }
        const toIdList = (v) => String(v ?? '').split(',').map((x) => Number(x)).filter((x) => Number.isFinite(x));
        if (params.ids !== undefined && params.ids !== null && params.ids !== '') {
            const ids = toIdList(params.ids);
            if (ids.length === 0)
                return null;
            qb.andWhere('u.id IN (:...ids)', { ids });
        }
        if (params.excludeIds !== undefined && params.excludeIds !== null && params.excludeIds !== '') {
            const ex = toIdList(params.excludeIds);
            if (ex.length > 0)
                qb.andWhere('u.id NOT IN (:...ex)', { ex });
        }
        const search = String(params.search ?? '').trim();
        if (search) {
            qb.andWhere('(u.email LIKE :q OR u.nombre LIKE :q OR u.numeroDocumento LIKE :q OR u.numeroCelular LIKE :q)', { q: `%${search}%` });
        }
        return qb;
    }
    async listClienteIds(params = {}) {
        const qb = this.construirQueryClientes(params);
        if (!qb)
            return { data: [], total: 0, success: true, message: 'SIN COINCIDENCIAS' };
        const rows = await qb.select('u.id', 'id').getRawMany();
        const ids = (rows || []).map((r) => Number(r.id)).filter((x) => Number.isFinite(x));
        return { data: ids, total: ids.length, success: true, message: 'IDS DE CLIENTES' };
    }
    async getClientesStats() {
        const base = () => this.userRepository.createQueryBuilder('u').where('u.perfil = :p', { p: 'cliente' });
        const total = await base().getCount();
        const activos = await base().andWhere('u.estaActivo = :a', { a: true }).getCount();
        const inactivos = await base().andWhere('u.estaActivo = :a', { a: false }).getCount();
        const invitados = await base().andWhere('u.esInvitado = :i', { i: true }).getCount();
        const nuevos30d = await base()
            .andWhere('u.fechaCreacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)')
            .getCount();
        const porMesRaw = await this.userRepository.query(`SELECT DATE_FORMAT(fechaCreacion, '%Y-%m') AS mes, COUNT(*) AS clientes
       FROM usuarios
       WHERE perfil = 'cliente' AND fechaCreacion >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY mes ORDER BY mes ASC`);
        const porMes = (porMesRaw || []).map((r) => ({ mes: r.mes, clientes: Number(r.clientes) }));
        const registrados = Math.max(0, total - invitados);
        const tipos = [
            { nombre: 'Registrados', valor: registrados },
            { nombre: 'Invitados', valor: invitados },
        ];
        const loginsRaw = await this.userRepository.query(`SELECT DATE_FORMAT(ultimoInicioSesion, '%Y-%m-%d') AS dia, COUNT(*) AS n
       FROM usuarios
       WHERE perfil = 'cliente' AND ultimoInicioSesion >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY dia`);
        const loginsByDay = new Map();
        for (const r of loginsRaw || []) {
            const key = String(r.dia).slice(0, 10);
            loginsByDay.set(key, Number(r.n));
        }
        const DOW = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        const actividadSemanal = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const activos = loginsByDay.get(key) || 0;
            actividadSemanal.push({
                dia: DOW[d.getDay()],
                activos,
                inactivos: Math.max(0, total - activos),
            });
        }
        return {
            data: { total, activos, inactivos, invitados, nuevos30d, porMes, tipos, actividadSemanal },
            success: true,
            message: 'STATS DE CLIENTES',
        };
    }
    async enviarMensajeMasivo(payload) {
        const ids = (Array.isArray(payload?.userIds) ? payload.userIds : [])
            .map((x) => Number(x))
            .filter((x) => Number.isFinite(x));
        if (ids.length === 0)
            return { success: false, message: 'NO HAY USUARIOS SELECCIONADOS' };
        if (!String(payload?.mensaje ?? '').trim())
            return { success: false, message: 'EL MENSAJE NO PUEDE ESTAR VACÍO' };
        const usuarios = await this.userRepository.find({ where: { id: (0, typeorm_2.In)(ids) } });
        const enviados = [];
        const sinTelefono = [];
        for (const u of usuarios) {
            const tel = String(u.numeroCelular ?? '').trim();
            if (tel) {
                this.logger.log(`[mensaje-masivo] (simulado) a ${tel} (user ${u.id})`);
                enviados.push({ id: u.id, telefono: tel });
            }
            else {
                sinTelefono.push(u.id);
            }
        }
        return {
            success: true,
            message: `Enviados ${enviados.length}, sin teléfono ${sinTelefono.length}`,
            data: { enviados, sinTelefono, bannerUrl: payload?.bannerUrl || null },
        };
    }
    async getProfile(userId) {
        const id = Number(userId);
        if (!Number.isFinite(id))
            return { data: null, success: false, message: 'USUARIO INVÁLIDO' };
        const u = await this.userRepository.findOne({ where: { id } });
        if (!u)
            return { data: null, success: false, message: 'USUARIO NO ENCONTRADO' };
        return {
            data: {
                nombre: u.nombre || '',
                email: u.email || '',
                numeroCelular: u.numeroCelular || '',
                numeroDocumento: u.numeroDocumento || '',
            },
            success: true,
            message: 'PERFIL DEL USUARIO',
        };
    }
    async updateProfile(userId, patch) {
        const id = Number(userId);
        if (!Number.isFinite(id))
            return { data: null, success: false, message: 'USUARIO INVÁLIDO' };
        const updates = {};
        if (patch?.nombre != null)
            updates.nombre = String(patch.nombre).trim();
        if (patch?.numeroCelular != null)
            updates.numeroCelular = String(patch.numeroCelular).trim();
        if (patch?.numeroDocumento != null)
            updates.numeroDocumento = String(patch.numeroDocumento).trim();
        if (patch?.email != null) {
            const email = String(patch.email).trim().toLowerCase();
            if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                updates.email = email;
        }
        if (patch?.parentescos != null)
            updates.parentescos = String(patch.parentescos);
        if (Object.keys(updates).length === 0)
            return { data: null, success: false, message: 'NADA QUE ACTUALIZAR' };
        await this.userRepository.update(id, updates);
        return { data: updates, success: true, message: 'PERFIL ACTUALIZADO' };
    }
    genDireccionId() {
        return `dir_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
    }
    normalizarDireccion(input = {}) {
        const ubic = input.ubicacion || {};
        return {
            etiqueta: String(input.etiqueta ?? '').trim() || 'Mi dirección',
            callePrincipal: String(input.callePrincipal ?? '').trim(),
            calleSecundaria: String(input.calleSecundaria ?? '').trim(),
            numerocasa: String(input.numerocasa ?? '').trim(),
            ciudad: String(input.ciudad ?? '').trim(),
            ciudadId: input.ciudadId != null ? Number(input.ciudadId) : null,
            barrio: String(input.barrio ?? '').trim(),
            referencia: String(input.referencia ?? '').trim(),
            ubicacion: {
                lat: ubic.lat != null ? Number(ubic.lat) : null,
                lng: ubic.lng != null ? Number(ubic.lng) : null,
            },
            predeterminada: !!input.predeterminada,
        };
    }
    async getUserAddresses(userId) {
        const id = Number(userId);
        if (!Number.isFinite(id))
            return { data: [], success: false, message: 'USUARIO INVÁLIDO' };
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user)
            return { data: [], success: false, message: 'USUARIO NO ENCONTRADO' };
        return { data: Array.isArray(user.direcciones) ? user.direcciones : [], success: true, message: 'DIRECCIONES DEL USUARIO' };
    }
    async addUserAddress(userId, address) {
        const id = Number(userId);
        if (!Number.isFinite(id))
            return { data: [], success: false, message: 'USUARIO INVÁLIDO' };
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user)
            return { data: [], success: false, message: 'USUARIO NO ENCONTRADO' };
        const lista = Array.isArray(user.direcciones) ? [...user.direcciones] : [];
        const nueva = { id: this.genDireccionId(), ...this.normalizarDireccion(address) };
        if (nueva.predeterminada || lista.length === 0) {
            lista.forEach((d) => (d.predeterminada = false));
            nueva.predeterminada = true;
        }
        lista.push(nueva);
        await this.userRepository.update(id, { direcciones: lista });
        return { data: lista, nueva, success: true, message: 'DIRECCIÓN GUARDADA' };
    }
    async updateUserAddress(userId, addressId, patch) {
        const id = Number(userId);
        if (!Number.isFinite(id))
            return { data: [], success: false, message: 'USUARIO INVÁLIDO' };
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user)
            return { data: [], success: false, message: 'USUARIO NO ENCONTRADO' };
        const lista = Array.isArray(user.direcciones) ? [...user.direcciones] : [];
        const idx = lista.findIndex((d) => d.id === addressId);
        if (idx === -1)
            return { data: lista, success: false, message: 'DIRECCIÓN NO ENCONTRADA' };
        const actualizada = { ...lista[idx], ...this.normalizarDireccion({ ...lista[idx], ...patch }), id: addressId };
        lista[idx] = actualizada;
        if (actualizada.predeterminada) {
            lista.forEach((d, i) => { if (i !== idx)
                d.predeterminada = false; });
        }
        await this.userRepository.update(id, { direcciones: lista });
        return { data: lista, success: true, message: 'DIRECCIÓN ACTUALIZADA' };
    }
    async deleteUserAddress(userId, addressId) {
        const id = Number(userId);
        if (!Number.isFinite(id))
            return { data: [], success: false, message: 'USUARIO INVÁLIDO' };
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user)
            return { data: [], success: false, message: 'USUARIO NO ENCONTRADO' };
        let lista = Array.isArray(user.direcciones) ? [...user.direcciones] : [];
        const tenia = lista.some((d) => d.id === addressId);
        lista = lista.filter((d) => d.id !== addressId);
        if (tenia && lista.length > 0 && !lista.some((d) => d.predeterminada)) {
            lista[0].predeterminada = true;
        }
        await this.userRepository.update(id, { direcciones: lista });
        return { data: lista, success: true, message: tenia ? 'DIRECCIÓN ELIMINADA' : 'NO EXISTÍA LA DIRECCIÓN' };
    }
    async updateUsers(filters, updates) {
        const result = await this.userRepository.update(filters, updates);
        if (!result) {
            return {
                data: [],
                total: 0,
                message: 'NO SE ENCONTRARON USUARIOS',
                success: false,
            };
        }
        return {
            data: result,
            total: result.affected || 0,
            message: 'USUARIOS ACTUALIZADOS EXISTOSAMENTE',
            success: true,
        };
    }
};
exports.UserService = UserService;
exports.UserService = UserService = UserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_schemas_1.User)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object])
], UserService);
//# sourceMappingURL=user.service.js.map