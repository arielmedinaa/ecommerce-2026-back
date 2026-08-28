export interface ProveedorDocumentoMeta {
  id: number;
  nombre_archivo: string;
  content_type: string;
  s3_key: string;
  url: string;
}

export interface EtlProbeResult {
  autorizado: boolean;
  statusCode?: number;
  detalle: string;
  comandoCurl: string;
}

export interface EtlDiscovery {
  baseUrl: string;
  // 'body': credenciales van como campos del body (form-urlencoded o JSON),
  // patrón común en APIs legacy tipo Consoft/CEC (cod, pas en el POST body).
  authType: 'bearer' | 'apikey' | 'basic' | 'body' | 'none';
  authHeaderName?: string;
  authValueHint?: string;
  probeMethod: 'GET' | 'POST';
  probePath: string;
  probeHeaders?: Record<string, string>;
  // Usado cuando authType === 'body': campos exactos a mandar en el POST,
  // ya resueltos con las credenciales de prueba/homologación encontradas en
  // la documentación (ej. { cod: "23153", pas: "t10TAO6RhkFJNqyZds_2U", ope: "10" }).
  probeBodyParams?: Record<string, string>;
  probeContentType?: 'application/x-www-form-urlencoded' | 'application/json';
  notas: string;
}

// Contrato que el código generado por Claude para cada proveedor debe producir
// por cada producto de un lote, antes de mandarlo a `etl_upsert_product_seller`.
export interface ProductsSellerEtlPayload {
  codigo_proveedor_interno?: string;
  codigo_de_barra?: string;
  nombre_articulo: string;
  descripcion?: string;
  precioventa: number;
  stock_actual: number;
  imagen_1: string;
  imagen_2?: string;
  imagen_3?: string;
  imagen_4?: string;
  imagen_5?: string;
  codigo_marca?: string | null;
  codigo_categoria?: string | null;
  codigo_subcategoria?: string | null;
}

export type EtlEstado =
  | 'sin_generar'
  | 'en_progreso'
  | 'bloqueado_por_ip'
  | 'error_generacion'
  | 'error_pruebas'
  | 'activo';

export interface EtlProviderConfig {
  idProveedor: number;
  slug: string;
  estado: EtlEstado;
  baseUrl?: string;
  cronExpression: string;
  activo: boolean;
  cursor?: string | null;
  ultimaCorrida?: string;
  ultimoResultado?: {
    productosProcesados: number;
    productosRechazados: number;
    motivosRechazo: Record<string, number>;
  };
  mensaje?: string;
  actualizadoEn: string;
}
