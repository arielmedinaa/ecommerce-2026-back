export interface ImportErrorCodeInfo {
  codigo: number;
  motivo: string;
  descripcion: string;
  solucion: string;
  campo: string | null;
}

export const IMPORT_ERROR_CODES: Record<number, ImportErrorCodeInfo> = {
  101: {
    codigo: 101,
    motivo: 'Archivo sin hojas',
    descripcion: 'El archivo subido no contiene ninguna hoja de cálculo legible.',
    solucion: 'Volvé a descargar la plantilla desde el panel y completá los datos ahí, sin eliminar ninguna hoja.',
    campo: null,
  },
  102: {
    codigo: 102,
    motivo: "No se encontró la hoja 'Productos'",
    descripcion: "El archivo no tiene una hoja llamada 'Productos' (la segunda hoja de la plantilla, donde se cargan los productos).",
    solucion: "Usá la plantilla oficial descargada desde el panel y completá los datos en la hoja 'Productos', sin renombrarla ni borrarla.",
    campo: null,
  },
  103: {
    codigo: 103,
    motivo: 'Falta el nombre del producto',
    descripcion: 'La columna nombre_articulo está vacía en esta fila.',
    solucion: 'Completá el nombre del producto tal como querés que se muestre en la tienda.',
    campo: 'nombre_articulo',
  },
  104: {
    codigo: 104,
    motivo: 'Falta la marca',
    descripcion: 'La columna marca está vacía en esta fila.',
    solucion: 'Escribí el nombre de la marca del producto (texto libre, se relaciona automáticamente con nuestro catálogo).',
    campo: 'marca',
  },
  105: {
    codigo: 105,
    motivo: 'Falta la categoría',
    descripcion: 'La columna categoria está vacía en esta fila.',
    solucion: 'Elegí una categoría desde el desplegable de la celda (no escribas texto libre).',
    campo: 'categoria',
  },
  106: {
    codigo: 106,
    motivo: 'Costo inválido',
    descripcion: 'El costo está vacío, no es un número, o es menor al mínimo permitido (Gs. 9.000).',
    solucion: 'Completá costo con un número entero en guaraníes, sin puntos ni comas, de al menos Gs. 9.000.',
    campo: 'costo',
  },
  107: {
    codigo: 107,
    motivo: 'Stock inválido',
    descripcion: 'El stock actual está vacío, no es un número, o es negativo.',
    solucion: 'Completá stock_actual con un número igual o mayor a 0.',
    campo: 'stock_actual',
  },
  108: {
    codigo: 108,
    motivo: 'Falta la imagen principal',
    descripcion: 'La columna imagen_1 está vacía en esta fila.',
    solucion: 'Completá imagen_1 con la URL pública de una imagen del producto (debe poder abrirse sin usuario/contraseña), o pegá la imagen directamente en la celda.',
    campo: 'imagen_1',
  },
  109: {
    codigo: 109,
    motivo: 'Imagen no accesible o demasiado pesada',
    descripcion: 'La imagen indicada no se pudo descargar, no es una imagen válida, o pesa más de 1MB.',
    solucion: 'Usá una imagen de hasta 1MB accesible públicamente (sin usuario/contraseña), o pegala directamente en la celda de Excel.',
    campo: 'imagen_1',
  },
};

export function getImportErrorCodesList(): ImportErrorCodeInfo[] {
  return Object.values(IMPORT_ERROR_CODES);
}
