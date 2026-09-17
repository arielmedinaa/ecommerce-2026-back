export type ExtraColumnaTipo = 'string' | 'number' | 'boolean';

export interface ExtraColumnaDef {
  key: string;
  label: string;
  tipo: ExtraColumnaTipo;
  descripcion: string;
  ejemplo: string;
  obligatorio: false;
}

export const EXTRA_COLUMNAS_OPCIONALES: ExtraColumnaDef[] = [
  {
    key: 'deposito',
    label: 'Depósito',
    tipo: 'string',
    descripcion: 'En qué depósito o sucursal se encuentra el stock de este producto.',
    ejemplo: 'Depósito Central',
    obligatorio: false,
  },
  {
    key: 'disponible_retiro_inmediato',
    label: 'Disponible para retiro inmediato',
    tipo: 'boolean',
    descripcion: 'Si podemos pasar a retirar este producto ahora mismo (SI/NO).',
    ejemplo: 'SI',
    obligatorio: false,
  },
  {
    key: 'tiempo_preparacion_horas',
    label: 'Tiempo de preparación (horas)',
    tipo: 'number',
    descripcion: 'Horas estimadas para tener el producto listo antes de retiro o envío.',
    ejemplo: '24',
    obligatorio: false,
  },
  {
    key: 'peso_kg',
    label: 'Peso (kg)',
    tipo: 'number',
    descripcion: 'Peso del producto embalado, en kilogramos.',
    ejemplo: '2.5',
    obligatorio: false,
  },
  {
    key: 'dimensiones_cm',
    label: 'Dimensiones (cm)',
    tipo: 'string',
    descripcion: 'Dimensiones del producto embalado, formato Largo x Ancho x Alto.',
    ejemplo: '30x20x15',
    obligatorio: false,
  },
  {
    key: 'garantia_meses',
    label: 'Garantía (meses)',
    tipo: 'number',
    descripcion: 'Meses de garantía que ofrece el proveedor sobre este producto.',
    ejemplo: '12',
    obligatorio: false,
  },
  {
    key: 'condicion_producto',
    label: 'Condición del producto',
    tipo: 'string',
    descripcion: 'Estado del producto: nuevo, reacondicionado, usado, etc.',
    ejemplo: 'Nuevo',
    obligatorio: false,
  },
  {
    key: 'video_url',
    label: 'Video del producto (URL)',
    tipo: 'string',
    descripcion: 'Link a un video que muestre el producto.',
    ejemplo: 'https://youtube.com/watch?v=...',
    obligatorio: false,
  },
  {
    key: 'ficha_tecnica_url',
    label: 'Ficha técnica (URL)',
    tipo: 'string',
    descripcion: 'Link a la ficha técnica o manual del producto.',
    ejemplo: 'https://miempresa.com/ficha.pdf',
    obligatorio: false,
  },
  {
    key: 'color_variante',
    label: 'Color / Variante',
    tipo: 'string',
    descripcion: 'Color o variante específica de este producto.',
    ejemplo: 'Azul',
    obligatorio: false,
  },
  {
    key: 'unidad_venta',
    label: 'Unidad de venta',
    tipo: 'string',
    descripcion: 'Cómo se vende el producto: unidad, caja, pack, etc.',
    ejemplo: 'Caja x6',
    obligatorio: false,
  },
  {
    key: 'observaciones_proveedor',
    label: 'Observaciones',
    tipo: 'string',
    descripcion: 'Cualquier información adicional que quieras darnos sobre este producto.',
    ejemplo: 'Frágil, requiere cuidado en el transporte',
    obligatorio: false,
  },
];

export const EXTRA_COLUMNAS_KEYS = EXTRA_COLUMNAS_OPCIONALES.map((c) => c.key);

export const EXTRA_COLUMNAS_POR_KEY = new Map(EXTRA_COLUMNAS_OPCIONALES.map((c) => [c.key, c]));

export const DEFAULT_STOCK_MINIMO_GENERAL = 20;
