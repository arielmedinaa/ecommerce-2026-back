// Repara el mojibake tipico de un excel de proveedor cuyo texto UTF-8 (tildes,
// enies, guiones, comillas tipograficas) fue reinterpretado en algun punto
// como un encoding de 1 byte y reencodeado -- ej.: la vocal acentuada (bytes
// UTF-8 0xC3 0x81) termina guardada como caracteres sueltos en vez de la
// letra original.
//
// Hay dos variantes segun cual fue el encoding intermedio de 1 byte:
// - Latin-1 puro: los bytes 0x80-0x9F quedan como caracteres de control C1
//   invisibles (caso ya visto: una "A" con tilde se corrompia asi).
// - Windows-1252: esos mismos bytes 0x80-0x9F se muestran como signos de
//   puntuacion imprimibles (€, comillas curvas, guion largo, etc.) en vez de
//   caracteres de control -- caso visto en un nombre de producto con
//   "a-circunfleja + euro + guion" en vez de un guion largo normal.
//
// La senial inequivoca de cualquiera de las dos variantes es la presencia de
// alguno de esos caracteres: un nombre de producto real nunca los contiene
// sueltos, asi que solo se intenta reparar cuando aparecen -- evitar tocar
// texto que ya es valido es mas importante que "arreglar" de mas.

const CP1252_A_BYTE: Record<string, number> = {
  '€': 0x80,
  '‚': 0x82,
  'ƒ': 0x83,
  '„': 0x84,
  '…': 0x85,
  '†': 0x86,
  '‡': 0x87,
  'ˆ': 0x88,
  '‰': 0x89,
  'Š': 0x8a,
  '‹': 0x8b,
  'Œ': 0x8c,
  'Ž': 0x8e,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '˜': 0x98,
  '™': 0x99,
  'š': 0x9a,
  '›': 0x9b,
  'œ': 0x9c,
  'ž': 0x9e,
  'Ÿ': 0x9f,
};

const MARCADOR_MOJIBAKE = new RegExp('[\\x80-\\x9f' + Object.keys(CP1252_A_BYTE).join('') + ']');
const CARACTER_REEMPLAZO = String.fromCharCode(0xfffd);

// Antes de aplicar el truco de latin1->utf8, deshace la sustitucion propia de
// Windows-1252: cada signo de puntuacion imprimible que corresponde a un byte
// 0x80-0x9F se vuelve a convertir en ese byte (como caracter de control),
// para que el string quede en la misma forma que si el encoding intermedio
// hubiera sido Latin-1 puro.
function normalizarComoLatin1(texto: string): string {
  let resultado = '';
  for (const caracter of texto) {
    const byte = CP1252_A_BYTE[caracter];
    resultado += byte !== undefined ? String.fromCharCode(byte) : caracter;
  }
  return resultado;
}

export function repararMojibake(texto: string | null | undefined): string {
  if (!texto) return texto || '';
  if (!MARCADOR_MOJIBAKE.test(texto)) return texto;

  try {
    const normalizado = normalizarComoLatin1(texto);
    const reparado = Buffer.from(normalizado, 'latin1').toString('utf8');
    // Si el round-trip genero caracteres de reemplazo, el texto no era el
    // mojibake esperado -- se deja como estaba antes que arruinarlo mas. Esto
    // tambien protege el uso legitimo de un guion largo o comillas curvas
    // reales: al no formar parte de una secuencia UTF-8 valida, el round-trip
    // falla y se descarta el intento de reparacion.
    if (reparado.indexOf(CARACTER_REEMPLAZO) !== -1) return texto;
    return reparado;
  } catch {
    return texto;
  }
}
