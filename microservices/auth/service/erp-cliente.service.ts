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
      if (!c) {

        try {
          const personas = await this.econt.executeQuery<any>(
            `SELECT primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, nombre_completo
             FROM bicsa_personas WHERE nro_documento = ? LIMIT 1`,
            [String(ruc)],
          );
          const p = personas?.[0];
          if (p) {
            const firstName =
              [this.str(p.primer_nombre), this.str(p.segundo_nombre)].filter(Boolean).join(' ') ||
              this.str(p.nombre_completo).split(/\s+/)[0] ||
              '';
            const lastName = [this.str(p.primer_apellido), this.str(p.segundo_apellido)]
              .filter(Boolean)
              .join(' ');
            if (firstName || lastName) {
              return {
                encontrado: true,
                documento: String(ruc),
                firstName,
                lastName,
              };
            }
          }
        } catch (e) {
          this.logger.warn(
            `ERP fallback personas no disponible (${documento}): ${(e as any)?.message ?? e}`,
          );
        }
        return { encontrado: false };
      }

      const referencias = await this.getReferencias(Number(c.codigo));
      const { firstName, lastName } = await this.splitNombre(c);

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
      this.logger.warn(
        `ERP cliente lookup falló (${documento}): ${(e as any)?.message ?? e}`,
      );
      return { encontrado: false };
    }
  }

  private async getReferencias(
    codigoCliente: number,
  ): Promise<ErpReferencia[]> {
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
        if ((nKey && vistosNombre.has(nKey)) || (cKey && vistosCel.has(cKey)))
          continue;
        if (nKey) vistosNombre.add(nKey);
        if (cKey) vistosCel.add(cKey);
        out.push({ nombre, parentesco: this.str(r.parentesco), celular });
        if (out.length >= 3) break;
      }
      return out;
    } catch (e) {
      this.logger.warn(
        `ERP referencias lookup falló (cliente ${codigoCliente}): ${(e as any)?.message ?? e}`,
      );
      return [];
    }
  }

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
          .map((r) => ({
            codigo: Number(r.codigo),
            nombre: this.str(r.nombre),
          }))
          .filter((r) => r.nombre),
        rubros: (rubros || [])
          .map((r) => ({
            id: Number(r.id),
            descripcion: this.str(r.descripcion),
          }))
          .filter((r) => r.descripcion),
      };
    } catch (e) {
      this.logger.warn(
        `ERP catálogos cargo/rubro falló: ${(e as any)?.message ?? e}`,
      );
      return { cargos: [], rubros: [] };
    }
  }

  private toDateStr(v: unknown): string {
    if (v == null || v === '') return '';
    try {
      const d = v instanceof Date ? v : new Date(String(v));
      if (isNaN(d.getTime())) return '';
      
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }

  private parseRuc(documento: string): number | null {
    const base = String(documento ?? '')
      .trim()
      .split('-')[0]
      .replace(/\D/g, '');
    if (!base) return null;
    const n = Number(base);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private async splitNombre(
    c: any,
  ): Promise<{ firstName: string; lastName: string }> {
    const n1 = this.str(c.nombre1);
    const ap = [this.str(c.apellido1), this.str(c.apellido2)]
      .filter(Boolean)
      .join(' ')
      .trim();
    
    if (ap) return { firstName: n1 || this.str(c.nombre), lastName: ap };

    const doc = c.dv ? `${c.ruc}-${c.dv}` : String(c.ruc ?? '');
    const bicsa = await this.nombreDesdeBicsa(doc);
    if (bicsa && bicsa.lastName) return bicsa;

    const full = n1 || this.str(c.nombre);
    return this.splitPorTokens(full);
  }

  private async nombreDesdeBicsa(
    documento: string,
  ): Promise<{ firstName: string; lastName: string } | null> {
    const ruc = this.parseRuc(documento);
    if (!ruc) return null;
    try {
      const rows = await this.econt.executeQuery<any>(
        `SELECT primer_nombre, segundo_nombre, primer_apellido, segundo_apellido
         FROM bicsa_personas WHERE nro_documento = ? LIMIT 1`,
        [String(ruc)],
      );
      const p = rows?.[0];
      if (!p) return null;
      const firstName = [this.str(p.primer_nombre), this.str(p.segundo_nombre)]
        .filter(Boolean)
        .join(' ');
      const lastName = [this.str(p.primer_apellido), this.str(p.segundo_apellido)]
        .filter(Boolean)
        .join(' ');
      if (!firstName && !lastName) return null;
      return { firstName, lastName };
    } catch (e) {
      this.logger.warn(
        `ERP nombreDesdeBicsa falló (${documento}): ${(e as any)?.message ?? e}`,
      );
      return null;
    }
  }

  private splitPorTokens(full: string): {
    firstName: string;
    lastName: string;
  } {
    const parts = this.str(full).split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    if (parts.length === 2)
      return { firstName: parts[0], lastName: parts[1] };
    if (parts.length === 3)
      return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    return {
      firstName: parts.slice(0, 2).join(' '),
      lastName: parts.slice(2).join(' '),
    };
  }

  private str(v: unknown): string {
    return v == null ? '' : String(v).trim();
  }
}
