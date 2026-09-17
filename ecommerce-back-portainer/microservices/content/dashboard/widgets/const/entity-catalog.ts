export type TipoCampo = 'texto' | 'numero' | 'fecha' | 'moneda' | 'booleano';
/**
 * 'conteo_unico' = COUNT(DISTINCT columna) — necesario porque unir una
 * entidad "cabecera" (ej. Pedidos) con una "detalle" (ej. Detalle de
 * pedidos, N líneas por pedido) multiplica las filas de la cabecera: contar
 * filas con 'conteo' cuenta líneas, no pedidos. 'conteo_unico' cuenta
 * valores distintos y evita ese conteo inflado.
 */
/**
 * 'combinar' = GROUP_CONCAT(DISTINCT columna) — para un LISTADO (sin otra
 * agregación) donde el join con una entidad "detalle" repite la cabecera una
 * vez por línea (ej. un pedido con 2 productos aparece 2 veces): en vez de
 * mostrar el dato de "detalle" en su propia fila, se combinan sus valores en
 * una sola celda ("Producto A, Producto B") y la cabecera queda en una única
 * fila. Es el único camino, junto con GROUP BY, para deduplicar listados.
 */
export type TipoAgregacion = 'suma' | 'conteo' | 'conteo_unico' | 'promedio' | 'combinar';
/**
 * 'erp': vive en la base del ERP (`EcontDatabaseService`) — se puede unir
 * libremente con cualquier otra entidad 'erp' vía JOIN real.
 * 'cart': vive en la base propia del microservicio cart (`cart_db`, misma
 * instancia MariaDB, otro schema) — NO se puede unir por JOIN directo con
 * entidades 'erp' (son conexiones separadas). Solo soporta los "puentes"
 * puntuales que arma `DynamicQueryBuilderService` a mano (ver
 * `pertenece_a_promocion`), no un motor de join genérico cross-DB.
 */
export type OrigenEntidad = 'erp' | 'cart';

export interface CampoEntidad {
  key: string;
  nombre: string;
  columna: string;
  tipo: TipoCampo;
  agregable?: TipoAgregacion[];
}

export interface ParClave {
  campoA: string;
  campoB: string;
}

export interface RelacionSugerida {
  entidadDestino: string;
  pares: ParClave[];
  descripcion: string;
}

export interface EntidadCatalogo {
  key: string;
  nombre: string;
  descripcion: string;
  origen: OrigenEntidad;
  tabla: string;
  alias: string;
  campos: CampoEntidad[];
  relacionesSugeridas: RelacionSugerida[];
}

export const ENTITY_CATALOG: EntidadCatalogo[] = [
  {
    key: 'ventas',
    nombre: 'Ventas',
    descripcion: 'Facturas emitidas por toda la empresa (ventacab).',
    origen: 'erp',
    tabla: 'ventacab',
    alias: 'vc',
    campos: [
      { key: 'fecha', nombre: 'Fecha de la venta', columna: 'vc.fecha', tipo: 'fecha' },
      { key: 'comprobante', nombre: 'Tipo de comprobante', columna: 'vc.comprobante', tipo: 'texto' },
      { key: 'numero', nombre: 'Número de comprobante', columna: 'vc.numero', tipo: 'texto' },
      {
        key: 'monto',
        nombre: 'Monto vendido',
        columna: '(vc.exenta + vc.gravada5 + vc.gravada10)',
        tipo: 'moneda',
        agregable: ['suma', 'promedio'],
      },
    ],
    relacionesSugeridas: [],
  },
  {
    key: 'pedidos_a_facturar',
    nombre: 'Pedidos (Ecommerce)',
    descripcion: 'Solicitudes de pedido generadas desde la tienda online (solicitudcab).',
    origen: 'erp',
    tabla: 'solicitudcab',
    alias: 's',
    campos: [
      { key: 'fecha', nombre: 'Fecha del pedido', columna: 's.fecha', tipo: 'fecha' },
      { key: 'fecha_recepcion', nombre: 'Fecha de recepción/aprobación', columna: 's.age_frecepcion', tipo: 'fecha' },
      { key: 'comprobante', nombre: 'Tipo de comprobante', columna: 's.comprobante', tipo: 'texto' },
      { key: 'numero', nombre: 'Número de comprobante', columna: 's.numero', tipo: 'texto' },
      { key: 'cliente_codigo', nombre: 'Código de cliente', columna: 's.cliente', tipo: 'numero' },
      { key: 'estado_codigo', nombre: 'Código de estado', columna: 's.estado_soli', tipo: 'numero' },
      { key: 'vendedor_codigo', nombre: 'Código de vendedor', columna: 's.vendedor', tipo: 'numero' },
      { key: 'secuencia', nombre: 'Secuencia', columna: 's.secuencia', tipo: 'numero' },
      {
        key: 'monto',
        nombre: 'Monto del pedido',
        columna: 's.gravada10',
        tipo: 'moneda',
        agregable: ['suma', 'promedio'],
      },
    ],
    relacionesSugeridas: [
      {
        entidadDestino: 'clientes',
        pares: [{ campoA: 'cliente_codigo', campoB: 'codigo' }],
        descripcion: 'Pedidos se relaciona con Clientes por el código de cliente.',
      },
      {
        entidadDestino: 'estados_pedido',
        pares: [{ campoA: 'estado_codigo', campoB: 'codigo' }],
        descripcion: 'Pedidos se relaciona con Estados de pedido por el código de estado.',
      },
      {
        entidadDestino: 'detalle_pedidos',
        pares: [
          { campoA: 'comprobante', campoB: 'comprobante' },
          { campoA: 'numero', campoB: 'numero' },
        ],
        descripcion: 'Pedidos se relaciona con Detalle de pedidos por comprobante y número.',
      },
      {
        entidadDestino: 'vendedores',
        pares: [{ campoA: 'vendedor_codigo', campoB: 'codigo' }],
        descripcion: 'Pedidos se relaciona con Vendedores por el código de vendedor.',
      },
    ],
  },
  {
    key: 'detalle_pedidos',
    nombre: 'Detalle de pedidos',
    descripcion: 'Líneas de producto y promoción aplicada dentro de cada pedido (solicituddet).',
    origen: 'erp',
    tabla: 'solicituddet',
    alias: 'sd',
    campos: [
      { key: 'comprobante', nombre: 'Tipo de comprobante', columna: 'sd.comprobante', tipo: 'texto' },
      { key: 'numero', nombre: 'Número de comprobante', columna: 'sd.numero', tipo: 'texto' },
      { key: 'producto_codigo', nombre: 'Código de producto', columna: 'sd.codigo', tipo: 'texto' },
      { key: 'descripcion', nombre: 'Descripción de la línea', columna: 'sd.descrip', tipo: 'texto' },
      { key: 'promocion_id', nombre: 'ID de promoción aplicada', columna: 'sd.id_promo', tipo: 'numero' },
    ],
    relacionesSugeridas: [
      {
        entidadDestino: 'productos',
        pares: [{ campoA: 'producto_codigo', campoB: 'codigo' }],
        descripcion: 'Detalle de pedidos se relaciona con Productos por el código de producto.',
      },
      {
        entidadDestino: 'promociones',
        pares: [{ campoA: 'promocion_id', campoB: 'id_promo' }],
        descripcion: 'Detalle de pedidos se relaciona con Promociones por el ID de promoción.',
      },
    ],
  },
  {
    key: 'clientes',
    nombre: 'Clientes',
    descripcion: 'Maestro de clientes del ERP.',
    origen: 'erp',
    tabla: 'cliente',
    alias: 'cl',
    campos: [
      { key: 'codigo', nombre: 'Código de cliente', columna: 'cl.codigo', tipo: 'numero' },
      { key: 'nombre', nombre: 'Nombre completo', columna: 'cl.nombre', tipo: 'texto' },
      { key: 'ruc', nombre: 'RUC / documento', columna: 'cl.ruc', tipo: 'texto' },
      { key: 'email', nombre: 'Email', columna: 'cl.email', tipo: 'texto' },
      { key: 'celular', nombre: 'Celular', columna: 'cl.celular', tipo: 'texto' },
      { key: 'ciudad', nombre: 'Código de ciudad', columna: 'cl.ciudad', tipo: 'numero' },
    ],
    relacionesSugeridas: [],
  },
  {
    key: 'productos',
    nombre: 'Productos',
    descripcion: 'Maestro de artículos del ERP (catálogo completo, no solo web).',
    origen: 'erp',
    tabla: 'articulo',
    alias: 'a',
    campos: [
      { key: 'codigo', nombre: 'Código de producto', columna: 'a.codigo', tipo: 'texto' },
      { key: 'codigo_articulo', nombre: 'Código de artículo (interno)', columna: 'a.codigo_articulo', tipo: 'texto' },
      { key: 'nombre', nombre: 'Nombre del producto', columna: 'a.nombre', tipo: 'texto' },
      { key: 'categoria_codigo', nombre: 'Código de categoría', columna: 'a.familia', tipo: 'numero' },
      { key: 'marca_codigo', nombre: 'Código de marca', columna: 'a.marca', tipo: 'numero' },
      { key: 'precioventa', nombre: 'Precio de venta', columna: 'a.precioventa', tipo: 'moneda', agregable: ['suma', 'promedio'] },
      { key: 'activo_web', nombre: 'Publicado en la tienda web', columna: 'a.web', tipo: 'booleano' },
    ],
    relacionesSugeridas: [
      {
        entidadDestino: 'categorias',
        pares: [{ campoA: 'categoria_codigo', campoB: 'codigo' }],
        descripcion: 'Productos se relaciona con Categorías por su código.',
      },
      {
        entidadDestino: 'marcas',
        pares: [{ campoA: 'marca_codigo', campoB: 'codigo' }],
        descripcion: 'Productos se relaciona con Marcas por su código.',
      },
    ],
  },
  {
    key: 'categorias',
    nombre: 'Categorías',
    descripcion: 'Familias de productos (categorías).',
    origen: 'erp',
    tabla: 'familia',
    alias: 'f',
    campos: [
      { key: 'codigo', nombre: 'Código de categoría', columna: 'f.codigo', tipo: 'numero' },
      { key: 'nombre', nombre: 'Nombre de la categoría', columna: 'f.nombre', tipo: 'texto' },
    ],
    relacionesSugeridas: [],
  },
  {
    key: 'marcas',
    nombre: 'Marcas',
    descripcion: 'Marcas de productos.',
    origen: 'erp',
    tabla: 'marca',
    alias: 'm',
    campos: [
      { key: 'codigo', nombre: 'Código de marca', columna: 'm.codigo', tipo: 'numero' },
      { key: 'nombre', nombre: 'Nombre de la marca', columna: 'm.nombre', tipo: 'texto' },
    ],
    relacionesSugeridas: [],
  },
  {
    key: 'promociones',
    nombre: 'Promociones',
    descripcion: 'Campañas y promociones configuradas (tbl_promos_cabeceras).',
    origen: 'erp',
    tabla: 'tbl_promos_cabeceras',
    alias: 'pc',
    campos: [
      { key: 'id_promo', nombre: 'ID de promoción', columna: 'pc.id_promo', tipo: 'numero' },
      { key: 'nombre', nombre: 'Nombre de la promoción', columna: 'pc.nombre', tipo: 'texto' },
      { key: 'fecha_inicio', nombre: 'Fecha de inicio', columna: 'pc.fecha_inicio', tipo: 'fecha' },
      { key: 'fecha_fin', nombre: 'Fecha de fin', columna: 'pc.fecha_fin', tipo: 'fecha' },
      { key: 'canal', nombre: 'Canal', columna: 'pc.canal', tipo: 'texto' },
    ],
    relacionesSugeridas: [],
  },
  {
    key: 'carritos',
    nombre: 'Carritos',
    descripcion: 'Carritos de compra del ecommerce (activos, abandonados o finalizados). Vive en otra base de datos: no se puede combinar libremente con cards del ERP.',
    origen: 'cart',
    tabla: 'carritos',
    alias: 'ca',
    campos: [
      { key: 'codigo', nombre: 'Código de carrito', columna: 'ca.codigo', tipo: 'numero' },
      { key: 'estado', nombre: 'Estado', columna: 'ca.estado', tipo: 'texto' },
      { key: 'finished', nombre: '¿Finalizado?', columna: 'ca.finished', tipo: 'texto' },
      { key: 'creado', nombre: 'Fecha de creación', columna: 'ca.createdAt', tipo: 'fecha' },
      { key: 'actualizado', nombre: 'Última actualización', columna: 'ca.updatedAt', tipo: 'fecha' },
      {
        key: 'cliente_documento',
        nombre: 'Documento del cliente',
        columna: "JSON_UNQUOTE(JSON_EXTRACT(ca.cliente, '$.documento'))",
        tipo: 'texto',
      },
      {
        key: 'cliente_nombre',
        nombre: 'Nombre del cliente',
        columna: "JSON_UNQUOTE(JSON_EXTRACT(ca.cliente, '$.razonsocial'))",
        tipo: 'texto',
      },
      {
        key: 'cliente_email',
        nombre: 'Email del cliente',
        columna: "JSON_UNQUOTE(JSON_EXTRACT(ca.cliente, '$.correo'))",
        tipo: 'texto',
      },
    ],
    // Sin JOIN directo: es otra base de datos. El único puente soportado
    // ("pertenece a la promoción X") se resuelve como filtro especial en
    // DynamicQueryBuilderService, no como relación de catálogo.
    relacionesSugeridas: [],
  },
  {
    key: 'vendedores',
    nombre: 'Vendedores',
    descripcion: 'Maestro de vendedores del ERP.',
    origen: 'erp',
    tabla: 'vendedor',
    alias: 'vd',
    campos: [
      { key: 'codigo', nombre: 'Código de vendedor', columna: 'vd.codigo', tipo: 'numero' },
      { key: 'nombre', nombre: 'Nombre del vendedor', columna: 'vd.nombre', tipo: 'texto' },
      { key: 'coordinador', nombre: 'Código de coordinador', columna: 'vd.coordinador', tipo: 'numero' },
    ],
    relacionesSugeridas: [],
  },
  {
    key: 'estados_pedido',
    nombre: 'Estados de pedido',
    descripcion: 'Catálogo de estados posibles de un pedido (tbl_estados_solicitud).',
    origen: 'erp',
    tabla: 'tbl_estados_solicitud',
    alias: 'tes',
    campos: [
      { key: 'codigo', nombre: 'Código de estado', columna: 'tes.codigo_estado_solicitud', tipo: 'numero' },
      { key: 'nombre', nombre: 'Nombre del estado', columna: 'tes.estado', tipo: 'texto' },
    ],
    relacionesSugeridas: [],
  },
];

export function buscarEntidad(key: string): EntidadCatalogo | undefined {
  return ENTITY_CATALOG.find((e) => e.key === key);
}

export function buscarCampo(entidad: EntidadCatalogo, campoKey: string): CampoEntidad | undefined {
  return entidad.campos.find((c) => c.key === campoKey);
}
