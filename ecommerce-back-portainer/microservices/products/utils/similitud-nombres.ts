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
