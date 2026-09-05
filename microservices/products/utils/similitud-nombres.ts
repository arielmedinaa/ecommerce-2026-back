/**
 * Similitud entre nombres de artículo, para detectar que un proveedor está
 * volviendo a subir un producto que ya tenemos aunque no haya mandado el mismo
 * código interno (o haya cambiado un detalle de redacción).
 *
 * Usamos el coeficiente de Dice sobre bigramas: es tolerante a palabras
 * reordenadas y a diferencias de largo, y no penaliza tanto como Levenshtein
 * cuando el proveedor agrega o saca un adjetivo. No requiere dependencias ni
 * soporte del motor de base de datos (MariaDB no trae trigramas).
 */

/**
 * Normaliza para comparar: sin acentos, sin signos, en minúsculas y con los
 * espacios colapsados. "Cortapelo  Oraimo SmartTrimmer 2" y
 * "cortapelo oraimo smarttrimmer 2" tienen que dar exactamente lo mismo.
 */
export function normalizarNombre(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigramas(texto: string): Map<string, number> {
  const mapa = new Map<string, number>();
  for (let i = 0; i < texto.length - 1; i++) {
    const par = texto.slice(i, i + 2);
    mapa.set(par, (mapa.get(par) || 0) + 1);
  }
  return mapa;
}

/**
 * Devuelve un valor entre 0 y 1. 1 = nombres idénticos tras normalizar.
 */
export function similitudNombres(a: string, b: string): number {
  const na = normalizarNombre(a);
  const nb = normalizarNombre(b);

  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // Con menos de 2 caracteres no hay bigramas que comparar.
  if (na.length < 2 || nb.length < 2) return 0;

  const ba = bigramas(na);
  const bb = bigramas(nb);

  let interseccion = 0;
  for (const [par, veces] of ba) {
    const enB = bb.get(par);
    if (enB) interseccion += Math.min(veces, enB);
  }

  const totalA = na.length - 1;
  const totalB = nb.length - 1;
  return (2 * interseccion) / (totalA + totalB);
}
