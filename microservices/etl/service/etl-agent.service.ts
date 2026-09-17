import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ImageStorageService } from '@shared/common/services/image-storage.service';
import { ClaudeClientService } from '@shared/common/services/claude-client.service';
import { EtlConfigStoreService } from './etl-config-store.service';
import { ProviderRunnerService } from './provider-runner.service';
import { extractDocumentText } from '../utils/document-text.util';
import { runCurl } from '../utils/curl.util';
import { fetchLegacyTls } from '../utils/legacy-tls-fetch.util';
import { EtlDiscovery, EtlProviderConfig, ProveedorDocumentoMeta } from '../types';

const PROVIDERS_DIR = path.join(__dirname, '..', 'providers');

const SYSTEM_DISCOVERY = `Sos un ingeniero senior de integraciones ETL. Vas a leer documentación técnica que un
proveedor de e-commerce entregó para integrarse por API (Dropshipping). Tu única tarea acá es
identificar, del texto, los datos de conexión: URL base de la API, mecanismo de autenticación,
y una ruta/operación de "prueba" barata (health-check, ping, versión de API, o el primer endpoint
de listado) que sirva para verificar si nuestra IP pública ya fue autorizada por el proveedor.

Muchas APIs legacy (tipo Consoft/CEC y similares) NO usan headers de autenticación: mandan las
credenciales como campos del body de un POST (ej. cod/pas/usuario/senha), habitualmente
form-urlencoded. Si es ese el caso, usá authType="body" y llená "probeBodyParams" con el nombre
EXACTO de cada campo que la documentación pide, usando las credenciales de prueba/homologación
que el propio documento entrega para ese fin (son credenciales de prueba, no secretos de
producción — usalas tal cual aparecen). Si en cambio la auth es por header (Bearer/API-Key),
usá authType="bearer"/"apikey" y completá authHeaderName/authValueHint en vez de
probeBodyParams. Nunca inventes credenciales que no estén en el texto: si no hay ninguna, dejá
authValueHint/probeBodyParams vacíos y decilo en "notas".`;

const SYSTEM_CODEGEN = `Sos un programador experto en integraciones ETL para un marketplace de
Dropshipping, escribiendo TypeScript idiomático (Node 20, fetch global disponible, sin librerías
externas salvo las del propio Node). Vas a generar el conector de un proveedor específico a
partir de su documentación. Reglas estrictas:
- Devolvés SOLO dos archivos: "extractor.ts" y "mapper.ts". Nada de infraestructura, nada de
  base de datos, nada de credenciales hardcodeadas (usá process.env.<NOMBRE> para secretos).
- "extractor.ts" exporta: export async function extraerLote(cursor: string | null): Promise<{ items: any[]; nextCursor: string | null }>
  Debe paginar por lote según lo que la documentación describa (page/offset/cursor), usando fetch.
- Si en "Datos de conexión ya confirmados" viene "needsLegacyTls": true, este proveedor tiene TLS
  legacy (DH chico o certificado vencido) que el fetch global de Node rechaza. En ese caso NO uses
  fetch global: importá { fetchLegacyTls } from '../../utils/legacy-tls-fetch.util' (ya existe,
  no la generes) y usala exactamente igual que fetch para TODAS las llamadas HTTP del extractor.
  Si no viene o es false, usá el fetch global normal.
- "mapper.ts" exporta: export function mapearProducto(raw: any): { payload: { codigo_proveedor_interno?: string; codigo_de_barra?: string; nombre_articulo: string; descripcion?: string; costo: number; stock_actual: number; codigo_marca?: string | null; codigo_categoria?: string | null; codigo_subcategoria?: string | null }; imagenUrl: string | null } | null
  Debe devolver null si la fila no tiene los datos mínimos (nombre y precio). NUNCA inventes
  campos que no estén en el "raw": si un dato no viene, dejalo undefined.
- Cada producto debe traer codigo_proveedor_interno o codigo_de_barra (al menos uno), si no
  tiene ninguno el mapper debe devolver null.
Respondé con el formato exacto:
===FILE: extractor.ts===
<contenido completo>
===FILE: mapper.ts===
<contenido completo>
Sin explicaciones antes, entre medio ni después.`;

@Injectable()
export class EtlAgentService {
  private readonly logger = new Logger(EtlAgentService.name);

  constructor(
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
    private readonly imageStorage: ImageStorageService,
    private readonly claude: ClaudeClientService,
    private readonly configStore: EtlConfigStoreService,
    private readonly runner: ProviderRunnerService,
  ) {}

  async getStatus(idProveedor: number): Promise<{ data: EtlProviderConfig | null; success: boolean; message: string }> {
    const config = this.configStore.getByIdProveedor(idProveedor);
    if (!config) return { data: null, success: true, message: 'Todavía no se generó una integración para este proveedor' };
    return { data: config, success: true, message: 'OK' };
  }

  async generate(idProveedor: number, email: string): Promise<{ data: EtlProviderConfig; success: boolean; message: string }> {
    const proveedorInfo: any = await firstValueFrom(
      this.productsClient.send({ cmd: 'get_proveedor_profile' }, { idProveedor }),
    );
    const nombreProveedor = proveedorInfo?.data?.nombre || email;
    const slug = this.configStore.slugify(nombreProveedor, idProveedor);

    let config: EtlProviderConfig = {
      idProveedor,
      slug,
      estado: 'en_progreso',
      cronExpression: process.env.ETL_DEFAULT_CRON || '0 */6 * * *',
      activo: false,
      actualizadoEn: new Date().toISOString(),
    };
    this.configStore.save(config);

    try {
      // 1) Cargar y leer todos los documentos subidos por el proveedor.
      const documentosTexto = await this.cargarDocumentos(idProveedor);
      if (!documentosTexto.trim()) {
        return this.fail(config, 'error_generacion', 'El proveedor todavía no subió documentación para leer.');
      }

      // 2) Descubrir baseUrl/auth/ruta de prueba a partir de la documentación.
      const discovery = await this.claude.askJson<EtlDiscovery>(
        SYSTEM_DISCOVERY,
        `Documentación del proveedor "${nombreProveedor}":\n\n${documentosTexto}\n\nDevolvé JSON con esta forma exacta: { "baseUrl": string, "authType": "bearer"|"apikey"|"basic"|"body"|"none", "authHeaderName": string|undefined, "authValueHint": string|undefined, "probeMethod": "GET"|"POST", "probePath": string, "probeHeaders": object|undefined, "probeBodyParams": object|undefined, "probeContentType": "application/x-www-form-urlencoded"|"application/json"|undefined, "notas": string }. Si "probePath" es una ruta relativa que ya incluye query params (ej. "?ope=10"), dejalo así; si es una URL completa distinta a baseUrl (ej. otro dominio de homologación), poné la URL completa en "probePath".`,
      );
      config.baseUrl = discovery.baseUrl;
      this.configStore.save(config);

      // 3) Probar si nuestra IP pública ya está autorizada por el proveedor.
      const probe = await this.probarIpAutorizada(discovery);
      if (!probe.autorizado) {
        return this.fail(
          config,
          'bloqueado_por_ip',
          `Nuestra IP pública todavía no está autorizada por "${nombreProveedor}". Detalle: ${probe.detalle} (comando: ${probe.comandoCurl})`,
        );
      }

      discovery.needsLegacyTls = await this.necesitaTlsLegacy(discovery);
      this.logger.log(`needsLegacyTls=${discovery.needsLegacyTls} para proveedor ${idProveedor}`);

      // 4) Generar el conector (extractor.ts + mapper.ts) con Claude.
      const codigoGenerado = await this.claude.ask(
        SYSTEM_CODEGEN,
        `Documentación del proveedor "${nombreProveedor}":\n\n${documentosTexto}\n\nDatos de conexión ya confirmados:\n${JSON.stringify(discovery, null, 2)}`,
      );
      const archivos = this.parseArchivosGenerados(codigoGenerado);
      if (!archivos['extractor.ts'] || !archivos['mapper.ts']) {
        return this.fail(config, 'error_generacion', 'Claude no devolvió extractor.ts y mapper.ts en el formato esperado.');
      }
      this.escribirArchivosProveedor(slug, archivos);

      // 5) Verificar que el código generado compila.
      const compileOk = await this.verificarCompilacion(slug);
      if (!compileOk.ok) {
        return this.fail(config, 'error_generacion', `El código generado no compila: ${compileOk.detalle}`);
      }

      // 6) Prueba real: un lote completo a través del harness determinístico.
      const reporte = await this.runner.runOneLote(idProveedor, slug, email, null);
      config.ultimoResultado = {
        productosProcesados: reporte.productosProcesados,
        productosRechazados: reporte.productosRechazados,
        motivosRechazo: reporte.motivosRechazo,
      };
      config.ultimaCorrida = new Date().toISOString();

      if (reporte.productosProcesados === 0 || reporte.productosCreados + reporte.productosActualizados === 0) {
        return this.fail(config, 'error_pruebas', 'La prueba de integración no logró cargar ningún producto válido.');
      }

      // 7) Activar en producción — el scheduler central lo recoge en el
      // siguiente tick porque relee los configs con `activo: true`.
      config.estado = 'activo';
      config.activo = true;
      config.mensaje = `Activo. Última prueba: ${reporte.productosCreados + reporte.productosActualizados} productos cargados, ${reporte.productosRechazados} rechazados.`;
      config.actualizadoEn = new Date().toISOString();
      this.configStore.save(config);

      return { data: config, success: true, message: config.mensaje };
    } catch (error: any) {
      this.logger.error(`generate() falló para proveedor ${idProveedor}: ${error.message}`);
      return this.fail(config, 'error_generacion', error.message);
    }
  }

  private fail(config: EtlProviderConfig, estado: EtlProviderConfig['estado'], mensaje: string) {
    config.estado = estado;
    config.activo = false;
    config.mensaje = mensaje;
    config.actualizadoEn = new Date().toISOString();
    this.configStore.save(config);
    return { data: config, success: false, message: mensaje };
  }

  private async cargarDocumentos(idProveedor: number): Promise<string> {
    const documentosResult: any = await firstValueFrom(
      this.productsClient.send({ cmd: 'list_proveedor_documentos' }, { idProveedor }),
    );
    const documentos: ProveedorDocumentoMeta[] = documentosResult?.data || [];
    const textos: string[] = [];
    for (const doc of documentos) {
      try {
        const { buffer } = await this.imageStorage.getObjectBuffer(doc.s3_key);
        const texto = await extractDocumentText(buffer, doc.content_type, doc.nombre_archivo);
        textos.push(`===== DOCUMENTO: ${doc.nombre_archivo} =====\n${texto}`);
      } catch (error: any) {
        this.logger.warn(`No se pudo leer el documento ${doc.nombre_archivo}: ${error.message}`);
      }
    }
    return textos.join('\n\n');
  }

  private async probarIpAutorizada(discovery: EtlDiscovery): Promise<{ autorizado: boolean; detalle: string; comandoCurl: string }> {
    const { url, headers, body, method } = this.construirRequestProbe(discovery);
    const resultado = await runCurl({ method: method as 'GET' | 'POST', url, headers, body, timeoutMs: 10000 });

    if (resultado.error) {
      return { autorizado: false, detalle: `No se pudo conectar: ${resultado.error}`, comandoCurl: resultado.comando };
    }
    if (resultado.statusCode === 401 || resultado.statusCode === 403) {
      return { autorizado: false, detalle: `El proveedor respondió ${resultado.statusCode}: ${resultado.body.slice(0, 300)}`, comandoCurl: resultado.comando };
    }

    // Muchas APIs legacy devuelven siempre HTTP 200 con un campo de estatus
    // propio en el JSON (ej. Consoft/CEC: estatus=5 → "Ip do solicitante não
    // aceito"). Si el body parsea como JSON, buscamos ese patrón antes de
    // caer al chequeo de texto libre.
    const estatusJson = this.extraerEstatusDeRespuesta(resultado.body);
    if (estatusJson != null && [5, 61].includes(estatusJson)) {
      return { autorizado: false, detalle: `El proveedor respondió estatus=${estatusJson} (IP no aceptada o SSL requerido): ${resultado.body.slice(0, 300)}`, comandoCurl: resultado.comando };
    }

    const cuerpoIndicaBloqueoIp = /ip.*(no autorizad|not allowed|not whitelisted|blocked|denied|não aceit)/i.test(resultado.body);
    if (cuerpoIndicaBloqueoIp) {
      return { autorizado: false, detalle: resultado.body.slice(0, 300), comandoCurl: resultado.comando };
    }
    if (resultado.statusCode !== null && resultado.statusCode >= 200 && resultado.statusCode < 500) {
      return { autorizado: true, detalle: `Respondió ${resultado.statusCode}`, comandoCurl: resultado.comando };
    }
    return { autorizado: false, detalle: `Respuesta inesperada (status ${resultado.statusCode})`, comandoCurl: resultado.comando };
  }

  private construirRequestProbe(discovery: EtlDiscovery): { url: string; headers: Record<string, string>; body?: string; method: string } {
    const headers: Record<string, string> = { ...(discovery.probeHeaders || {}) };
    let body: string | undefined;

    if (discovery.authType === 'bearer') {
      headers['Authorization'] = `Bearer ${discovery.authValueHint || '<pendiente-de-configurar>'}`;
    } else if (discovery.authType === 'apikey' && discovery.authHeaderName) {
      headers[discovery.authHeaderName] = discovery.authValueHint || '<pendiente-de-configurar>';
    } else if (discovery.authType === 'body' && discovery.probeBodyParams) {
      const contentType = discovery.probeContentType || 'application/x-www-form-urlencoded';
      headers['Content-Type'] = contentType;
      body =
        contentType === 'application/json'
          ? JSON.stringify(discovery.probeBodyParams)
          : new URLSearchParams(discovery.probeBodyParams).toString();
    }

    const url = discovery.probePath.startsWith('http') ? discovery.probePath : `${discovery.baseUrl.replace(/\/$/, '')}${discovery.probePath}`;
    return { url, headers, body, method: discovery.probeMethod };
  }

  // El probe de arriba corre por `curl`, que tolera TLS legacy (DH chico,
  // certificados vencidos) por defecto. El `fetch` global de Node es más
  // estricto y puede rechazar exactamente la misma conexión. Si eso pasa,
  // el extractor generado necesita usar `fetchLegacyTls` en vez de `fetch`.
  private async necesitaTlsLegacy(discovery: EtlDiscovery): Promise<boolean> {
    const { url, headers, body, method } = this.construirRequestProbe(discovery);
    try {
      await fetch(url, { method, headers, body, signal: AbortSignal.timeout(10000) });
      return false;
    } catch (error: any) {
      const codigo = error?.cause?.code || error?.code;
      const esErrorTls = typeof codigo === 'string' && /^(ERR_SSL_|ERR_TLS_|CERT_|DEPTH_ZERO_|UNABLE_TO_)/.test(codigo);
      if (!esErrorTls) {
        this.logger.warn(`fetch global falló para el probe por un motivo no-TLS (${codigo || error?.message}); se asume needsLegacyTls=false`);
        return false;
      }
      // Confirmamos que con el dispatcher legacy sí funciona, para no marcar
      // needsLegacyTls=true por un problema que en realidad es otro.
      try {
        await fetchLegacyTls(url, { method, headers, body });
        return true;
      } catch {
        return false;
      }
    }
  }

  private extraerEstatusDeRespuesta(body: string): number | null {
    try {
      const parsed = JSON.parse(body);
      const primerElemento = Array.isArray(parsed) ? parsed[0] : parsed;
      const estatus = primerElemento?.estatus ?? primerElemento?.status;
      return typeof estatus === 'number' ? estatus : null;
    } catch {
      return null;
    }
  }

  private parseArchivosGenerados(texto: string): Record<string, string> {
    const archivos: Record<string, string> = {};
    const partes = texto.split(/===FILE:\s*([^=]+?)\s*===/g);
    // partes = ["", "extractor.ts", "<contenido>", "mapper.ts", "<contenido>", ...]
    for (let i = 1; i < partes.length; i += 2) {
      const nombre = partes[i].trim();
      const contenido = (partes[i + 1] || '').trim();
      if (nombre && contenido) archivos[nombre] = contenido;
    }
    return archivos;
  }

  private escribirArchivosProveedor(slug: string, archivos: Record<string, string>): void {
    const dir = path.join(PROVIDERS_DIR, slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    for (const [nombre, contenido] of Object.entries(archivos)) {
      fs.writeFileSync(path.join(dir, nombre), `${contenido}\n`, 'utf-8');
    }
  }

  private verificarCompilacion(slug: string): Promise<{ ok: boolean; detalle: string }> {
    const dir = path.join(PROVIDERS_DIR, slug);
    return new Promise((resolve) => {
      execFile(
        'npx',
        ['tsc', '--noEmit', '--skipLibCheck', '--esModuleInterop', '--target', 'ES2020', '--module', 'commonjs', 'extractor.ts', 'mapper.ts'],
        { cwd: dir, timeout: 60000 },
        (error, stdout, stderr) => {
          if (error) {
            resolve({ ok: false, detalle: (stdout || stderr || error.message).slice(0, 2000) });
            return;
          }
          resolve({ ok: true, detalle: 'OK' });
        },
      );
    });
  }
}
