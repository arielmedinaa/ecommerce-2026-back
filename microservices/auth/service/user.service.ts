import { User } from '@auth/schemas/user.schemas';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  
  private emailCodes = new Map<string, { code: string; exp: number }>();

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async findUserByEmail(email: string, excludeUserId?: number) {
    const e = String(email || '').trim();
    if (!e) return { exists: false };
    const u = await this.userRepository.findOne({ where: { email: e } });
    if (!u || (excludeUserId && u.id === Number(excludeUserId))) return { exists: false };
    return { exists: true, userId: u.id, nombre: u.nombre };
  }

  async sendEmailCode(email: string) {
    const e = String(email || '').trim().toLowerCase();
    if (!e) return { success: false, message: 'EMAIL REQUERIDO' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.emailCodes.set(e, { code, exp: Date.now() + 10 * 60 * 1000 });
    
    this.logger.log(`[email-code] (simulado) -> ${e}: ${code}`);
    return {
      success: true,
      message: 'CÓDIGO ENVIADO',
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
    };
  }

  verifyEmailCode(email: string, code: string) {
    const e = String(email || '').trim().toLowerCase();
    const rec = this.emailCodes.get(e);
    if (!rec) return { valid: false, message: 'NO HAY CÓDIGO PARA ESTE EMAIL' };
    if (Date.now() > rec.exp) {
      this.emailCodes.delete(e);
      return { valid: false, message: 'CÓDIGO EXPIRADO' };
    }
    if (String(code).trim() !== rec.code) return { valid: false, message: 'CÓDIGO INCORRECTO' };
    this.emailCodes.delete(e);
    return { valid: true, message: 'CÓDIGO VÁLIDO' };
  }

  async getAllUsers(filters: any): Promise<{
    data: any[];
    total: number;
    message: string;
    success: boolean;
    prefetch: any;
  }> {
    const result = await this.userRepository.query(
        'CALL sp_obtener_datos_usuario(?);', [filters.usuarioId || null]
    )
    
    const dbFilter: any = {};
    if (filters.id) dbFilter.id = filters.id;
    if (filters.email) dbFilter.email = filters.email;
    if (filters.nombre) dbFilter.nombre = filters.nombre;
    if (filters.perfil) dbFilter.perfil = filters.perfil;
    if (filters.estaActivo !== undefined) dbFilter.estaActivo = filters.estaActivo;
    dbFilter.perfil = 'cliente';

    const [data, total] = await this.userRepository.findAndCount({
      where: dbFilter,
      take: 200,
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

  async searchUsers(filters: any): Promise<{
    data: any[];
    total: number;
    message: string;
    success: boolean;
  }> {
    const [data, total] = await this.userRepository.findAndCount({
      where: filters,
      take: 200,
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

  async listClientes(params: any = {}): Promise<{
    data: any[];
    total: number;
    page: number;
    pageSize: number;
    message: string;
    success: boolean;
  }> {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
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

  private construirQueryClientes(params: any = {}): any | null {
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
    const toIdList = (v: any) =>
      String(v ?? '').split(',').map((x) => Number(x)).filter((x) => Number.isFinite(x));
    if (params.ids !== undefined && params.ids !== null && params.ids !== '') {
      const ids = toIdList(params.ids);
      if (ids.length === 0) return null;
      qb.andWhere('u.id IN (:...ids)', { ids });
    }
    if (params.excludeIds !== undefined && params.excludeIds !== null && params.excludeIds !== '') {
      const ex = toIdList(params.excludeIds);
      if (ex.length > 0) qb.andWhere('u.id NOT IN (:...ex)', { ex });
    }
    const search = String(params.search ?? '').trim();
    if (search) {
      qb.andWhere(
        '(u.email LIKE :q OR u.nombre LIKE :q OR u.numeroDocumento LIKE :q OR u.numeroCelular LIKE :q)',
        { q: `%${search}%` },
      );
    }
    return qb;
  }

  async listClienteIds(params: any = {}): Promise<{ data: number[]; total: number; success: boolean; message: string }> {
    const qb = this.construirQueryClientes(params);
    if (!qb) return { data: [], total: 0, success: true, message: 'SIN COINCIDENCIAS' };
    const rows = await qb.select('u.id', 'id').limit(5000).getRawMany();
    const ids = (rows || []).map((r: any) => Number(r.id)).filter((x: number) => Number.isFinite(x));
    return { data: ids, total: ids.length, success: true, message: 'IDS DE CLIENTES' };
  }

  async getClientesStats(): Promise<{ data: any; success: boolean; message: string }> {
    const base = () => this.userRepository.createQueryBuilder('u').where('u.perfil = :p', { p: 'cliente' });
    const total = await base().getCount();
    const activos = await base().andWhere('u.estaActivo = :a', { a: true }).getCount();
    const inactivos = await base().andWhere('u.estaActivo = :a', { a: false }).getCount();
    const invitados = await base().andWhere('u.esInvitado = :i', { i: true }).getCount();
    const nuevos30d = await base()
      .andWhere('u.fechaCreacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)')
      .getCount();

    const porMesRaw = await this.userRepository.query(
      `SELECT DATE_FORMAT(fechaCreacion, '%Y-%m') AS mes, COUNT(*) AS clientes
       FROM usuarios
       WHERE perfil = 'cliente' AND fechaCreacion >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY mes ORDER BY mes ASC`,
    );
    const porMes = (porMesRaw || []).map((r: any) => ({ mes: r.mes, clientes: Number(r.clientes) }));
    const registrados = Math.max(0, total - invitados);
    const tipos = [
      { nombre: 'Registrados', valor: registrados },
      { nombre: 'Invitados', valor: invitados },
    ];

    const loginsRaw = await this.userRepository.query(
      `SELECT DATE_FORMAT(ultimoInicioSesion, '%Y-%m-%d') AS dia, COUNT(*) AS n
       FROM usuarios
       WHERE perfil = 'cliente' AND ultimoInicioSesion >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY dia`,
    );
    const loginsByDay = new Map<string, number>();
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

  async getUsuariosPorRol(): Promise<{
    data: { total: number; cantidad: number; filas: Array<{ perfil: string; total: number }> };
    success: boolean;
    message: string;
  }> {
    try {
      const rows = await this.userRepository.query(
        `SELECT perfil, COUNT(*) AS total FROM usuarios GROUP BY perfil ORDER BY total DESC`,
      );
      const filas = (rows || []).map((r: any) => ({ perfil: r.perfil, total: Number(r.total) }));
      const total = filas.reduce((acc: number, f: any) => acc + f.total, 0);
      return { data: { total, cantidad: filas.length, filas }, success: true, message: 'Usuarios por rol obtenidos' };
    } catch (error) {
      return { data: { total: 0, cantidad: 0, filas: [] }, success: false, message: 'ERROR AL OBTENER USUARIOS POR ROL' };
    }
  }

  async enviarMensajeMasivo(payload: {
    userIds: (number | string)[];
    mensaje: string;
    bannerUrl?: string;
  }): Promise<{ success: boolean; message: string; data?: any }> {
    const ids = (Array.isArray(payload?.userIds) ? payload.userIds : [])
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));
    if (ids.length === 0) return { success: false, message: 'NO HAY USUARIOS SELECCIONADOS' };
    if (!String(payload?.mensaje ?? '').trim()) return { success: false, message: 'EL MENSAJE NO PUEDE ESTAR VACÍO' };

    const usuarios = await this.userRepository.find({ where: { id: In(ids) } });
    const enviados: Array<{ id: number; telefono: string }> = [];
    const sinTelefono: number[] = [];
    for (const u of usuarios) {
      const tel = String(u.numeroCelular ?? '').trim();
      if (tel) {
        
        this.logger.log(`[mensaje-masivo] (simulado) a ${tel} (user ${u.id})`);
        enviados.push({ id: u.id, telefono: tel });
      } else {
        sinTelefono.push(u.id);
      }
    }
    return {
      success: true,
      message: `Enviados ${enviados.length}, sin teléfono ${sinTelefono.length}`,
      data: { enviados, sinTelefono, bannerUrl: payload?.bannerUrl || null },
    };
  }

  async getProfile(userId: number): Promise<{ data: any; success: boolean; message: string }> {
    const id = Number(userId);
    if (!Number.isFinite(id)) return { data: null, success: false, message: 'USUARIO INVÁLIDO' };
    const u = await this.userRepository.findOne({ where: { id } });
    if (!u) return { data: null, success: false, message: 'USUARIO NO ENCONTRADO' };
    let datosLaborales: any = null;
    if (u.datosLaborales != null) {
      datosLaborales =
        typeof u.datosLaborales === 'string'
          ? this.safeParse(u.datosLaborales)
          : u.datosLaborales;
    }
    return {
      data: {
        nombre: u.nombre || '',
        email: u.email || '',
        numeroCelular: u.numeroCelular || '',
        numeroDocumento: u.numeroDocumento || '',
        parentescos: u.parentescos || '',
        datosLaborales,
      },
      success: true,
      message: 'PERFIL DEL USUARIO',
    };
  }

  async findByNumeroDocumento(numeroDocumento: string): Promise<{
    nombre: string;
    email: string;
    numeroCelular: string;
    numeroDocumento: string;
    parentescos: string;
    datosLaborales: any;
  } | null> {
    const doc = String(numeroDocumento ?? '').trim().split('-')[0].replace(/\D/g, '');
    if (!doc) return null;
    const u = await this.userRepository
      .createQueryBuilder('u')
      .where(
        "u.numeroDocumento = :doc OR SUBSTRING_INDEX(u.numeroDocumento, '-', 1) = :doc",
        { doc },
      )
      .orderBy('(u.datosLaborales IS NULL)', 'ASC')
      .addOrderBy('u.id', 'DESC')
      .getOne()
      .catch(() => null);
    if (!u) return null;
    let datosLaborales: any = null;
    if (u.datosLaborales != null) {
      datosLaborales =
        typeof u.datosLaborales === 'string'
          ? this.safeParse(u.datosLaborales)
          : u.datosLaborales;
    }
    return {
      nombre: u.nombre || '',
      email: u.email || '',
      numeroCelular: u.numeroCelular || '',
      numeroDocumento: u.numeroDocumento || '',
      parentescos: u.parentescos || '',
      datosLaborales,
    };
  }

  private safeParse(s: string): any {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  async updateProfile(
    userId: number,
    patch: { nombre?: string; numeroCelular?: string; numeroDocumento?: string; email?: string; parentescos?: string; datosLaborales?: any },
  ): Promise<{ data: any; success: boolean; message: string }> {
    const id = Number(userId);
    if (!Number.isFinite(id)) return { data: null, success: false, message: 'USUARIO INVÁLIDO' };
    const updates: any = {};
    if (patch?.nombre != null) updates.nombre = String(patch.nombre).trim();
    if (patch?.numeroCelular != null) updates.numeroCelular = String(patch.numeroCelular).trim();
    if (patch?.numeroDocumento != null) updates.numeroDocumento = String(patch.numeroDocumento).trim();
    if (patch?.email != null) {
      const email = String(patch.email).trim().toLowerCase();
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) updates.email = email;
    }
    
    if (patch?.parentescos != null) {
      const refs =
        typeof patch.parentescos === 'string' ? this.safeParse(patch.parentescos) : patch.parentescos;
      // Igual que datosLaborales: un array vacío o de referencias en blanco
      // no debe pisar los parentescos previamente guardados con datos reales.
      if (
        Array.isArray(refs) &&
        refs.some(
          (r) =>
            r &&
            typeof r === 'object' &&
            Object.values(r).some((v) => v != null && String(v).trim() !== '' && String(v).trim() !== '0'),
        )
      ) {
        updates.parentescos = JSON.stringify(refs);
      }
    }

    if (patch?.datosLaborales != null) {
      const lab =
        typeof patch.datosLaborales === 'string'
          ? this.safeParse(patch.datosLaborales)
          : patch.datosLaborales;
      // "0"/0 son valores default (sin dato real, p. ej. ciudad/salario sin
      // completar) y no deben contar como "tiene contenido" — de lo
      // contrario un objeto casi vacío (con solo esos defaults) pasa el
      // chequeo y pisa un datosLaborales previamente guardado con datos
      // reales.
      if (
        lab &&
        typeof lab === 'object' &&
        Object.values(lab).some((v) => v != null && String(v).trim() !== '' && String(v).trim() !== '0')
      ) {
        updates.datosLaborales = lab;
      }
    }
    if (Object.keys(updates).length === 0) return { data: null, success: false, message: 'NADA QUE ACTUALIZAR' };
    await this.userRepository.update(id, updates);
    return { data: updates, success: true, message: 'PERFIL ACTUALIZADO' };
  }

  private genDireccionId(): string {
    return `dir_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
  }

  private normalizarDireccion(input: any = {}): any {
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

  async getUserAddresses(userId: number): Promise<{ data: any[]; success: boolean; message: string }> {
    const id = Number(userId);
    if (!Number.isFinite(id)) return { data: [], success: false, message: 'USUARIO INVÁLIDO' };
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return { data: [], success: false, message: 'USUARIO NO ENCONTRADO' };
    return { data: Array.isArray(user.direcciones) ? user.direcciones : [], success: true, message: 'DIRECCIONES DEL USUARIO' };
  }

  async addUserAddress(userId: number, address: any): Promise<{ data: any[]; nueva?: any; success: boolean; message: string }> {
    const id = Number(userId);
    if (!Number.isFinite(id)) return { data: [], success: false, message: 'USUARIO INVÁLIDO' };
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return { data: [], success: false, message: 'USUARIO NO ENCONTRADO' };

    const lista = Array.isArray(user.direcciones) ? [...user.direcciones] : [];
    const norm = this.normalizarDireccion(address);

    const claveDir = (d: any) =>
      [d.callePrincipal, d.calleSecundaria, d.numerocasa, d.ciudadId ?? '', d.barrio]
        .map((v) => String(v ?? '').trim().toLowerCase())
        .join('|');
    const yaExiste = lista.find((d) => claveDir(d) === claveDir(norm));
    if (yaExiste) {
      return { data: lista, nueva: yaExiste, success: true, message: 'DIRECCIÓN YA EXISTENTE' };
    }
    const nueva = { id: this.genDireccionId(), ...norm };
    
    if (nueva.predeterminada || lista.length === 0) {
      lista.forEach((d) => (d.predeterminada = false));
      nueva.predeterminada = true;
    }
    lista.push(nueva);
    await this.userRepository.update(id, { direcciones: lista });
    return { data: lista, nueva, success: true, message: 'DIRECCIÓN GUARDADA' };
  }

  async updateUserAddress(userId: number, addressId: string, patch: any): Promise<{ data: any[]; success: boolean; message: string }> {
    const id = Number(userId);
    if (!Number.isFinite(id)) return { data: [], success: false, message: 'USUARIO INVÁLIDO' };
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return { data: [], success: false, message: 'USUARIO NO ENCONTRADO' };

    const lista = Array.isArray(user.direcciones) ? [...user.direcciones] : [];
    const idx = lista.findIndex((d) => d.id === addressId);
    if (idx === -1) return { data: lista, success: false, message: 'DIRECCIÓN NO ENCONTRADA' };

    const actualizada = { ...lista[idx], ...this.normalizarDireccion({ ...lista[idx], ...patch }), id: addressId };
    lista[idx] = actualizada;
    if (actualizada.predeterminada) {
      lista.forEach((d, i) => { if (i !== idx) d.predeterminada = false; });
    }
    await this.userRepository.update(id, { direcciones: lista });
    return { data: lista, success: true, message: 'DIRECCIÓN ACTUALIZADA' };
  }

  async deleteUserAddress(userId: number, addressId: string): Promise<{ data: any[]; success: boolean; message: string }> {
    const id = Number(userId);
    if (!Number.isFinite(id)) return { data: [], success: false, message: 'USUARIO INVÁLIDO' };
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return { data: [], success: false, message: 'USUARIO NO ENCONTRADO' };

    let lista = Array.isArray(user.direcciones) ? [...user.direcciones] : [];
    const tenia = lista.some((d) => d.id === addressId);
    lista = lista.filter((d) => d.id !== addressId);
    
    if (tenia && lista.length > 0 && !lista.some((d) => d.predeterminada)) {
      lista[0].predeterminada = true;
    }
    await this.userRepository.update(id, { direcciones: lista });
    return { data: lista, success: true, message: tenia ? 'DIRECCIÓN ELIMINADA' : 'NO EXISTÍA LA DIRECCIÓN' };
  }

  async updateUsers(filters: any, updates: any): Promise<{
    data: any;
    total: number;
    message: string;
    success: boolean;
  }> {
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
}
