// Parseo del campo `articulo.nota` (texto libre del ERP) en descripcion +
// caracteristicas estructuradas. Formato producido por el ERP:
//   "<intro de marketing>\n\nCaracteristicas:\nMarca: X\nPotencia: Y\n..."
// Funcion pura y sin dependencias: no necesita @Injectable como los demas
// .util.ts de este directorio (esos envuelven estado/repos, este no).

export interface NotaCaracteristica {
  tipo: string;
  dato: string;
}

export interface NotaParseada {
  descripcion: string;
  caracteristicas: NotaCaracteristica[];
}

const CARACTERISTICAS_HEADER = /\n{1,2}Caracter[íi]sticas:?\s*\n?/i;

export function parseNota(nota: string | null | undefined): NotaParseada {
  const raw = String(nota ?? '').trim();
  if (!raw) return { descripcion: '', caracteristicas: [] };

  const match = raw.match(CARACTERISTICAS_HEADER);
  if (!match || match.index === undefined) {
    return { descripcion: raw, caracteristicas: [] };
  }

  const descripcion = raw.slice(0, match.index).trim();
  const resto = raw.slice(match.index + match[0].length);

  const caracteristicas: NotaCaracteristica[] = resto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return { tipo: '', dato: line };
      return { tipo: line.slice(0, idx).trim(), dato: line.slice(idx + 1).trim() };
    });

  return { descripcion, caracteristicas };
}
