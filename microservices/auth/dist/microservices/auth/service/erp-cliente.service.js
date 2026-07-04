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
var ErpClienteService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpClienteService = void 0;
const common_1 = require("@nestjs/common");
const econt_database_module_1 = require("../../../shared/config/database/econt.database.module");
let ErpClienteService = ErpClienteService_1 = class ErpClienteService {
    constructor(econt) {
        this.econt = econt;
        this.logger = new common_1.Logger(ErpClienteService_1.name);
    }
    async getClienteErpByDocumento(documento) {
        const ruc = this.parseRuc(documento);
        if (!ruc)
            return { encontrado: false };
        try {
            const rows = await this.econt.executeQuery(`SELECT codigo, nombre, nombre1, apellido1, apellido2, ruc, dv, email,
                celular, telefono, direccion, direccion2, nrocasa, ciudad, barrio,
                lab_empresa, lab_cargo, lab_rubro, lab_fechaing, lab_salario,
                lab_ciudad, lab_barrio, lab_direccion, lab_direccion2, lab_nrocasa,
                lab_telefono, lab_contacto
         FROM cliente WHERE ruc = ? LIMIT 1`, [ruc]);
            const c = rows?.[0];
            if (!c)
                return { encontrado: false };
            const referencias = await this.getReferencias(Number(c.codigo));
            const { firstName, lastName } = this.splitNombre(c);
            return {
                encontrado: true,
                codigo: Number(c.codigo),
                documento: c.dv ? `${c.ruc}-${c.dv}` : String(c.ruc ?? ''),
                firstName,
                lastName,
                email: this.str(c.email),
                phone: this.str(c.celular) || this.str(c.telefono),
                callePrincipal: this.str(c.direccion),
                calleSecundaria: this.str(c.direccion2),
                numerocasa: c.nrocasa != null ? String(c.nrocasa) : '',
                ciudadId: c.ciudad != null ? String(c.ciudad) : '',
                barrio: this.str(c.barrio),
                laboral: {
                    empresa: this.str(c.lab_empresa),
                    cargo: this.str(c.lab_cargo),
                    rubro: this.str(c.lab_rubro),
                    fechaIngreso: this.toDateStr(c.lab_fechaing),
                    salario: c.lab_salario != null ? Number(c.lab_salario) : undefined,
                    ciudad: c.lab_ciudad != null ? String(c.lab_ciudad) : '',
                    barrio: this.str(c.lab_barrio),
                    callePrincipal: this.str(c.lab_direccion),
                    calleSecundaria: this.str(c.lab_direccion2),
                    numerocasa: c.lab_nrocasa != null ? String(c.lab_nrocasa) : '',
                    contactoNombre: this.str(c.lab_contacto),
                    contactoTelefono: this.str(c.lab_telefono),
                },
                referencias,
            };
        }
        catch (e) {
            this.logger.warn(`ERP cliente lookup falló (${documento}): ${e?.message ?? e}`);
            return { encontrado: false };
        }
    }
    async getReferencias(codigoCliente) {
        if (!codigoCliente)
            return [];
        try {
            const rows = await this.econt.executeQuery(`SELECT nombre, parentesco, celular FROM cs_cliente_referencia
         WHERE codigo_cliente = ? AND activo = 1`, [codigoCliente]);
            const out = [];
            const vistosNombre = new Set();
            const vistosCel = new Set();
            for (const r of rows || []) {
                const nombre = this.str(r.nombre);
                const celular = this.str(r.celular);
                const nKey = nombre.toLowerCase();
                const cKey = celular.replace(/\D/g, '');
                if (!nombre && !celular)
                    continue;
                if ((nKey && vistosNombre.has(nKey)) || (cKey && vistosCel.has(cKey)))
                    continue;
                if (nKey)
                    vistosNombre.add(nKey);
                if (cKey)
                    vistosCel.add(cKey);
                out.push({ nombre, parentesco: this.str(r.parentesco), celular });
                if (out.length >= 3)
                    break;
            }
            return out;
        }
        catch (e) {
            this.logger.warn(`ERP referencias lookup falló (cliente ${codigoCliente}): ${e?.message ?? e}`);
            return [];
        }
    }
    async getCatalogos() {
        try {
            const [cargos, rubros] = await Promise.all([
                this.econt.executeQuery(`SELECT codigo, nombre FROM cargo ORDER BY nombre`),
                this.econt.executeQuery(`SELECT id, descripcion FROM rubro_cliente ORDER BY descripcion`),
            ]);
            return {
                cargos: (cargos || [])
                    .map((r) => ({ codigo: Number(r.codigo), nombre: this.str(r.nombre) }))
                    .filter((r) => r.nombre),
                rubros: (rubros || [])
                    .map((r) => ({ id: Number(r.id), descripcion: this.str(r.descripcion) }))
                    .filter((r) => r.descripcion),
            };
        }
        catch (e) {
            this.logger.warn(`ERP catálogos cargo/rubro falló: ${e?.message ?? e}`);
            return { cargos: [], rubros: [] };
        }
    }
    toDateStr(v) {
        if (v == null || v === '')
            return '';
        try {
            const d = v instanceof Date ? v : new Date(String(v));
            if (isNaN(d.getTime()))
                return '';
            return d.toISOString().slice(0, 10);
        }
        catch {
            return '';
        }
    }
    parseRuc(documento) {
        const base = String(documento ?? '').trim().split('-')[0].replace(/\D/g, '');
        if (!base)
            return null;
        const n = Number(base);
        return Number.isFinite(n) && n > 0 ? n : null;
    }
    splitNombre(c) {
        const n1 = this.str(c.nombre1);
        const ap = [this.str(c.apellido1), this.str(c.apellido2)].filter(Boolean).join(' ').trim();
        if (n1 || ap)
            return { firstName: n1, lastName: ap };
        const full = this.str(c.nombre);
        const parts = full.split(/\s+/).filter(Boolean);
        return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
    }
    str(v) {
        return v == null ? '' : String(v).trim();
    }
};
exports.ErpClienteService = ErpClienteService;
exports.ErpClienteService = ErpClienteService = ErpClienteService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [econt_database_module_1.EcontDatabaseService])
], ErpClienteService);
//# sourceMappingURL=erp-cliente.service.js.map