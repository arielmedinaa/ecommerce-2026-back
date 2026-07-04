import { Injectable, Logger } from '@nestjs/common';
import { EcontDatabaseService } from '@shared/config/database/econt.database.module';

export interface ErpReferencia {
  nombre: string;
  parentesco: string;
  celular: string;
}

export interface ErpClienteDto {
  encontrado: boolean;
  codigo?: number;
  documento?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  callePrincipal?: string;
  calleSecundaria?: string;
  numerocasa?: string;
  ciudadId?: string;
  barrio?: string;
  laboral?: {
    empresa?: string;
    cargo?: string;
    rubro?: string;
    fechaIngreso?: string;
    salario?: number;
    ciudad?: string;
    barrio?: string;
    callePrincipal?: string;
    calleSecundaria?: string;
    numerocasa?: string;
    contactoNombre?: string;
    contactoTelefono?: string;
  };
  referencias?: ErpReferencia[];
}

export interface ErpCatalogos {
  cargos: { codigo: number; nombre: string }[];
  rubros: { id: number; descripcion: string }[];
}

@Injectable()
export class ErpClienteService {
  private readonly logger = new Logger(ErpClienteService.name);

  constructor(private readonly econt: EcontDatabaseService) {}

  // Busca un cliente del ERP por número de documento/RUC. La parte numérica antes
  // del guion es el `ruc`; el `-x` es el dígito verificador (dv). Best-effort: si el
  // ERP no responde devuelve { encontrado:false } para no romper el checkout.
  async getClienteErpByDocumento(documento: string): Promise<ErpClienteDto> {
    const ruc = this.parseRuc(documento);
    if (!ruc) return { encontrado: false };

    try {
      const rows = await this.econt.executeQuery<any>(
        `SELECT codigo, nombre, nombre1, apellido1, apellido2, ruc, dv, email,
                celular, telefono, direccion, direccion2, nrocasa, ciudad, barrio,
                lab_empresa, lab_cargo, lab_rubro, lab_fechaing, lab_salario,
                lab_ciudad, lab_barrio, lab_direccion, lab_direccion2, lab_nrocasa,
                lab_telefono, lab_contacto
         FROM cliente WHERE ruc = ? LIMIT 1`,
        [ruc],
      );
      const c = rows?.[0];
      if (!c) return { encontrado: false };

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
    } catch (e) {
      this.logger.warn(`ERP cliente lookup falló (${documento}): ${(e as any)?.message ?? e}`);
      return { encontrado: false };
    }
  }

  // Referencias familiares del cliente. El depto. de crédito exige hasta 3 sin
  // duplicar nombre ni celular.
  private async getReferencias(codigoCliente: number): Promise<ErpReferencia[]> {
    if (!codigoCliente) return [];
    try {
      const rows = await this.econt.executeQuery<any>(
        `SELECT nombre, parentesco, celular FROM cs_cliente_referencia
         WHERE codigo_cliente = ? AND activo = 1`,
        [codigoCliente],
      );
      const out: ErpReferencia[] = [];
      const vistosNombre = new Set<string>();
      const vistosCel = new Set<string>();
      for (const r of rows || []) {
        const nombre = this.str(r.nombre);
        const celular = this.str(r.celular);
        const nKey = nombre.toLowerCase();
        const cKey = celular.replace(/\D/g, '');
        if (!nombre && !celular) continue;
        if ((nKey && vistosNombre.has(nKey)) || (cKey && vistosCel.has(cKey))) continue;
        if (nKey) vistosNombre.add(nKey);
        if (cKey) vistosCel.add(cKey);
        out.push({ nombre, parentesco: this.str(r.parentesco), celular });
        if (out.length >= 3) break;
      }
      return out;
    } catch (e) {
      this.logger.warn(`ERP referencias lookup falló (cliente ${codigoCliente}): ${(e as any)?.message ?? e}`);
      return [];
    }
  }

  // Catálogos del ERP para los selects de Cargo y Rubro del checkout de crédito.
  // `cargo` y `rubro_cliente` son listas independientes. Best-effort.
  async getCatalogos(): Promise<ErpCatalogos> {
    try {
      const [cargos, rubros] = await Promise.all([
        this.econt.executeQuery<any>(
          `SELECT codigo, nombre FROM cargo ORDER BY nombre`,
        ),
        this.econt.executeQuery<any>(
          `SELECT id, descripcion FROM rubro_cliente ORDER BY descripcion`,
        ),
      ]);
      return {
        cargos: (cargos || [])
          .map((r) => ({ codigo: Number(r.codigo), nombre: this.str(r.nombre) }))
          .filter((r) => r.nombre),
        rubros: (rubros || [])
          .map((r) => ({ id: Number(r.id), descripcion: this.str(r.descripcion) }))
          .filter((r) => r.descripcion),
      };
    } catch (e) {
      this.logger.warn(`ERP catálogos cargo/rubro falló: ${(e as any)?.message ?? e}`);
      return { cargos: [], rubros: [] };
    }
  }

  private toDateStr(v: unknown): string {
    if (v == null || v === '') return '';
    try {
      const d = v instanceof Date ? v : new Date(String(v));
      if (isNaN(d.getTime())) return '';
      // Formato YYYY-MM-DD para inputs date.
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }

  private parseRuc(documento: string): number | null {
    const base = String(documento ?? '').trim().split('-')[0].replace(/\D/g, '');
    if (!base) return null;
    const n = Number(base);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private splitNombre(c: any): { firstName: string; lastName: string } {
    const n1 = this.str(c.nombre1);
    const ap = [this.str(c.apellido1), this.str(c.apellido2)].filter(Boolean).join(' ').trim();
    if (n1 || ap) return { firstName: n1, lastName: ap };
    // Fallback: partir `nombre` completo (primer token = nombre, resto = apellidos).
    const full = this.str(c.nombre);
    const parts = full.split(/\s+/).filter(Boolean);
    return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
  }

  private str(v: unknown): string {
    return v == null ? '' : String(v).trim();
  }
}
