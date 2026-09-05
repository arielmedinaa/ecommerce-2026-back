import { Injectable, Logger } from '@nestjs/common';
import {
  ESTADO_SOLICITUD_MAP,
  ESTADO_SOLICITUD_FASE_MAP,
} from '@cart/constants/cart.constants';
import * as http from 'http';
import * as https from 'https';
import * as mysql from 'mysql2/promise';

@Injectable()
export class UtilsCart {
  private logger = new Logger();
  async insertarCarritos(
    parametros: any,
  ): Promise<{ success: number; secuencia: number | null }> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(parametros);
      const useHttps = (process.env.CENTRAL_APP_PROTOCOL || 'https').toLowerCase() !== 'http';
      const client = useHttps ? https : http;

      const options: any = {
        hostname: `${process.env.CENTRAL_APP_HOST}`,
        port: 3055,
        path: '/api/solicitud_ecommerce/insert_ecommerce_solicitudes',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };
      if (useHttps) {
        options.rejectUnauthorized = false;
        options.checkServerIdentity = () => undefined;
      }

      this.logger.log(`ERP solicitud enviada a ${useHttps ? 'https' : 'http'}://${options.hostname}:${options.port}${options.path}: ${postData}`);

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            this.logger.log(`ERP respuesta ${res.statusCode}: ${data}`);
            let secuencia: number | null = null;
            try {
              secuencia = JSON.parse(data)?.secuencia ?? null;
            } catch {
              secuencia = null;
            }
            resolve({ success: 1, secuencia });
          } else {
            console.error(`Error HTTP: ${res.statusCode}`, data);
            resolve({ success: 0, secuencia: null });
          }
        });
      });

      req.on('error', (error) => {
        console.error('Hubo un error al realizar la petición:', error);
        resolve({ success: 0, secuencia: null });
      });

      req.write(postData);
      req.end();
    });
  }

  async getEstadoSolicitudEcont(
    codigoCarrito: number,
  ): Promise<string> {
    try {
      const estadoSoli = await this.consultarEstadoEcontDB(codigoCarrito);
      return ESTADO_SOLICITUD_MAP[estadoSoli] || 'Estado no identificado';
    } catch (error) {
      console.error(
        `Error consultando estado para carrito ${codigoCarrito}:`,
        error,
      );
      return 'No se pudo consultar el estado';
    }
  }

  /**
   * Resuelve el estado ERP de varios carritos en una sola query (evita el N+1
   * de abrir una conexión nueva por carrito). Devuelve un Map codigo->mensaje.
   */
  async getEstadosSolicitudEcontBatch(
    codigosCarrito: number[],
  ): Promise<Map<number, string>> {
    const resultado = new Map<number, string>();
    if (!codigosCarrito || codigosCarrito.length === 0) return resultado;

    try {
      const estados = await this.consultarEstadosEcontDBBatch(codigosCarrito);
      for (const codigo of codigosCarrito) {
        const estadoSoli = estados.get(codigo) ?? '00';
        resultado.set(
          codigo,
          ESTADO_SOLICITUD_MAP[estadoSoli] || 'Estado no identificado',
        );
      }
    } catch (error) {
      console.error('Error consultando estados de carritos (batch):', error);
      for (const codigo of codigosCarrito) {
        resultado.set(codigo, 'No se pudo consultar el estado');
      }
    }
    return resultado;
  }

  private erpPool: mysql.Pool | null = null;

  private getErpPool(): mysql.Pool {
    if (this.erpPool) return this.erpPool;

    const dbName = process.env.ECONT_DB_DATABASE;
    if (!dbName) {
      this.logger.error('ECONT_DB_DATABASE environment variable is not set');
      throw new Error('ECONT_DB_DATABASE environment variable is not set');
    }
    this.erpPool = mysql.createPool({
      host: process.env.ECONT_DB_HOST,
      port: parseInt(process.env.ECONT_DB_PORT || '3306'),
      user: process.env.ECONT_DB_USER,
      password: process.env.ECONT_DB_PASSWORD,
      database: dbName,
      connectionLimit: Number(process.env.ECONT_DB_POOL_SIZE || 5),
      connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
    });
    return this.erpPool;
  }

  async consultarEstadoEcontDB(secuencia: number): Promise<string> {
    try {
      const pool = this.getErpPool();
      const [rows] = await pool.query(
        'Select estado_soli from solicitudcab sb inner join cs_solicitud_ecommerce_cabecera csec on csec.solicitudcab_secuencia = sb.secuencia where csec.mongo_id = ?',
        [secuencia],
      );

      const result = rows as any[];
      return result.length > 0 ? result[0].estado_soli : '00';
    } catch (error) {
      console.error('Error consultando base de datos Econt:', error);
      return '00';
    }
  }

  async consultarEstadosEcontDBBatch(
    secuencias: number[],
  ): Promise<Map<number, string>> {
    const resultado = new Map<number, string>();
    if (!secuencias || secuencias.length === 0) return resultado;

    const pool = this.getErpPool();
    const ERP_QUERY_TIMEOUT_MS = 8000;
    const [rows] = await Promise.race([
      pool.query(
        'Select csec.mongo_id as mongo_id, estado_soli from solicitudcab sb inner join cs_solicitud_ecommerce_cabecera csec on csec.solicitudcab_secuencia = sb.secuencia where csec.mongo_id IN (?)',
        [secuencias],
      ),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout consultando estados ERP (${ERP_QUERY_TIMEOUT_MS}ms)`)),
          ERP_QUERY_TIMEOUT_MS,
        ),
      ),
    ]);

    for (const row of rows as any[]) {
      resultado.set(Number(row.mongo_id), row.estado_soli);
    }
    return resultado;
  }

  async resolverEstadoPedido(secuencia: number): Promise<{
    fase: string;
    estadoSoli?: string;
    mensaje?: string;
    estadoDispatch?: string;
    rutaId?: number | null;
    tipoDespacho?: number | null;
    fechaEstimada?: string | null;
    historial?: { estado: string; fecha: string }[];
  }> {
    try {
      const pool = this.getErpPool();

      const [dispatchRows] = await pool.query(
        `SELECT cdo.estado, cdo.ruta_id, cdo.tipo_despacho, cdo.fecha_estimada, edo.nombre
           FROM cs_dispatchtrack_orden cdo
           JOIN cs_estados_dispatchtrack_orden edo ON edo.id = cdo.estado
          WHERE cdo.orden_id = ?`,
        [String(secuencia)],
      );
      const dispatch = (dispatchRows as any[])[0];

      if (dispatch) {
        const [historialRows] = await pool.query(
          `SELECT edo.nombre AS estado, cdho.update_at AS fecha
             FROM cs_historial_dispatchtrack_orden cdho
             JOIN cs_estados_dispatchtrack_orden edo ON edo.id = cdho.estado
            WHERE cdho.orden_id = ?
            ORDER BY cdho.id ASC`,
          [String(secuencia)],
        );
        return {
          fase: 'dispatch',
          estadoDispatch: dispatch.nombre,
          rutaId: dispatch.ruta_id,
          tipoDespacho: dispatch.tipo_despacho,
          fechaEstimada: dispatch.fecha_estimada,
          historial: historialRows as any[],
        };
      }

      const [solicitudRows] = await pool.query(
        'SELECT estado_soli FROM solicitudcab WHERE secuencia = ?',
        [secuencia],
      );
      const result = solicitudRows as any[];
      if (result.length === 0) {
        return { fase: 'no_encontrado' };
      }
      const estadoSoli = result[0].estado_soli;
      return {
        fase: ESTADO_SOLICITUD_FASE_MAP[estadoSoli] || 'desconocido',
        estadoSoli,
        mensaje: ESTADO_SOLICITUD_MAP[estadoSoli] || 'Estado no identificado',
      };
    } catch (error) {
      console.error('Error resolviendo estado de pedido en ERP:', error);
      return { fase: 'error' };
    }
  }

  eliminarDuplicados(articulos: any[], tipo: string): any[] {
    if (!articulos || articulos.length === 0) {
      return [];
    }

    const mapaUnicos = new Map();

    articulos.forEach((articulo) => {
      if (tipo === 'credito') {
        const clave = `${articulo.codigo}_${articulo.credito?.cuota}_${articulo.credito?.precio}`;

        if (!mapaUnicos.has(clave)) {
          mapaUnicos.set(clave, articulo);
        } else {
          const existente = mapaUnicos.get(clave);
          existente.cantidad += articulo.cantidad;
        }
      } else {
        const clave = String(articulo.codigo);

        if (!mapaUnicos.has(clave)) {
          mapaUnicos.set(clave, articulo);
        } else {
          const existente = mapaUnicos.get(clave);
          existente.cantidad += articulo.cantidad;
        }
      }
    });

    return Array.from(mapaUnicos.values());
  }

  buildClienteFromToken(
    decodedToken: any,
    clienteToken: string,
    cuenta?: string,
    clienteActual?: any,
  ) {
    const idUsuario = parseInt(decodedToken?.sub || clienteActual?.id_usuario || 0);
    const correoToken = decodedToken?.email || '';
    const correoCuenta = cuenta && cuenta !== 'undefined' ? cuenta : '';

    return {
      ...clienteActual,
      equipo: clienteToken,
      razonsocial: decodedToken?.name || clienteActual?.razonsocial || '',
      documento:
        decodedToken?.numeroDocumento || clienteActual?.documento || '',
      correo: correoToken || correoCuenta || clienteActual?.correo || '',
      telefono: decodedToken?.numeroCelular || clienteActual?.telefono || '',
      id_usuario: Number.isNaN(idUsuario) ? 0 : idUsuario,
    };
  }
}
