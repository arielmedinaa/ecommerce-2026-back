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

  private async abrirConexionErp(): Promise<mysql.Connection> {
    const dbName = process.env.ECONT_DB_DATABASE;
    if (!dbName) {
      this.logger.error('ECONT_DB_DATABASE environment variable is not set');
      throw new Error('ECONT_DB_DATABASE environment variable is not set');
    }
    return mysql.createConnection({
      host: process.env.ECONT_DB_HOST,
      port: parseInt(process.env.ECONT_DB_PORT || '3306'),
      user: process.env.ECONT_DB_USER,
      password: process.env.ECONT_DB_PASSWORD,
      database: dbName,
    });
  }

  async consultarEstadoEcontDB(secuencia: number): Promise<string> {
    let connection: mysql.Connection | null = null;
    try {
      connection = await this.abrirConexionErp();

      const [rows] = await connection.query(
        'Select estado_soli from solicitudcab sb inner join cs_solicitud_ecommerce_cabecera csec on csec.solicitudcab_secuencia = sb.secuencia where csec.mongo_id = ?',
        [secuencia],
      );

      const result = rows as any[];
      await connection.end();
      return result.length > 0 ? result[0].estado_soli : '00';
    } catch (error) {
      if (connection) {
        await connection.end().catch(() => {});
      }
      console.error('Error consultando base de datos Econt:', error);
      return '00';
    }
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
    let connection: mysql.Connection | null = null;
    try {
      connection = await this.abrirConexionErp();

      const [dispatchRows] = await connection.query(
        `SELECT cdo.estado, cdo.ruta_id, cdo.tipo_despacho, cdo.fecha_estimada, edo.nombre
           FROM cs_dispatchtrack_orden cdo
           JOIN cs_estados_dispatchtrack_orden edo ON edo.id = cdo.estado
          WHERE cdo.orden_id = ?`,
        [String(secuencia)],
      );
      const dispatch = (dispatchRows as any[])[0];

      if (dispatch) {
        const [historialRows] = await connection.query(
          `SELECT edo.nombre AS estado, cdho.update_at AS fecha
             FROM cs_historial_dispatchtrack_orden cdho
             JOIN cs_estados_dispatchtrack_orden edo ON edo.id = cdho.estado
            WHERE cdho.orden_id = ?
            ORDER BY cdho.id ASC`,
          [String(secuencia)],
        );
        await connection.end();
        return {
          fase: 'dispatch',
          estadoDispatch: dispatch.nombre,
          rutaId: dispatch.ruta_id,
          tipoDespacho: dispatch.tipo_despacho,
          fechaEstimada: dispatch.fecha_estimada,
          historial: historialRows as any[],
        };
      }

      const [solicitudRows] = await connection.query(
        'SELECT estado_soli FROM solicitudcab WHERE secuencia = ?',
        [secuencia],
      );
      await connection.end();
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
      if (connection) {
        await connection.end().catch(() => {});
      }
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
