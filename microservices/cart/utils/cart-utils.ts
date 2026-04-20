import { Injectable, Logger } from '@nestjs/common';
import { ESTADO_SOLICITUD_MAP } from '@cart/constants/cart.constants';
import * as https from 'https';
import * as mysql from 'mysql2/promise';

@Injectable()
export class UtilsCart {
  private logger = new Logger();
  async insertarCarritos(parametros: any): Promise<number> {
    const url = `${process.env.CENTRAL_APP_URL}`;

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(parametros);

      const options = {
        hostname: `${process.env.CENTRAL_APP_HOST}`,
        port: 3055,
        path: '/api/solicitud_ecommerce/insert_ecommerce_solicitudes',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(1);
          } else {
            console.error(`Error HTTP: ${res.statusCode}`, data);
            resolve(0);
          }
        });
      });

      req.on('error', (error) => {
        console.error('Hubo un error al realizar la petición:', error);
        resolve(0);
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

  async consultarEstadoEcontDB(secuencia: number): Promise<string> {
    let connection: mysql.Connection | null = null;
    try {
      const dbName = process.env.ECONT_DB_DATABASE;
      if (!dbName) {
        this.logger.error('ECONT_DB_DATABASE environment variable is not set');
        throw new Error('ECONT_DB_DATABASE environment variable is not set');
      }
      connection = await mysql.createConnection({
        host: process.env.ECONT_DB_HOST,
        port: parseInt(process.env.ECONT_DB_PORT || '3306'),
        user: process.env.ECONT_DB_USER,
        password: process.env.ECONT_DB_PASSWORD,
        database: dbName,
      });

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
}
