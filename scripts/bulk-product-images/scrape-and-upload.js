// Por cada producto de worklist.json: busca imágenes en Google Images,
// descarta duplicadas (dHash perceptual), convierte a .webp <1MB, y las sube
// vía POST /api/products/:codigo/images (mismo endpoint que ya usa el admin,
// que YA valida .webp/image/webp y <1MB — este script solo tiene que producir
// archivos que cumplan esa validación).
//
// Uso: node scrape-and-upload.js [--limit N] [--dry-run] [--candidates 8]
//
// Requiere:
//   - GATEWAY_URL apuntando a un api-gateway alcanzable (default http://localhost:3100/api,
//     vía `kubectl port-forward svc/api-gateway 3100:3100`).
//   - worklist.json ya generado por find-missing.js.

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3100/api';
const MAX_BYTES = 1024 * 1024; // 1MB, mismo límite que ImageFileInterceptor
const MIN_QUALITY = 35;
const DELAY_MIN_MS = 2000;
const DELAY_MAX_MS = 5000;
const DHASH_MIN_DISTANCE = 6; // hamming distance mínima entre imágenes del mismo producto
const WHITE_BG_BORDER_PX = 10; // grosor del anillo de borde muestreado (sobre un resize a 100x100)
const WHITE_BG_MIN_MEAN = 235; // 0-255; fondo debe ser claro
const WHITE_BG_MAX_STD = 25; // fondo debe ser UNIFORME (descarta fotos de ambiente/cocina)
const CRASH_PATTERNS = [
  'detached frame',
  'navigating frame was detached',
  'session closed',
  'target closed',
  'protocol error',
];
function isCrashError(message) {
  const m = (message || '').toLowerCase();
  return CRASH_PATTERNS.some((p) => m.includes(p));
}

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}
const LIMIT = Number(argValue('--limit', '0')) || null;
const DRY_RUN = process.argv.includes('--dry-run');
const CANDIDATES_PER_PRODUCT = Number(argValue('--candidates', '20'));

const WORKLIST_PATH = path.join(__dirname, 'worklist.json');
const RESULTS_PATH = path.join(__dirname, 'results.log');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => sleep(DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS));

function loadDoneCodes() {
  if (!fs.existsSync(RESULTS_PATH)) return new Set();
  const lines = fs.readFileSync(RESULTS_PATH, 'utf8').split('\n').filter(Boolean);
  const done = new Set();
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (row.status === 'ok') done.add(String(row.codigo_articulo));
    } catch {
      // ignore malformed lines
    }
  }
  return done;
}

function logResult(row) {
  fs.appendFileSync(RESULTS_PATH, JSON.stringify({ ts: new Date().toISOString(), ...row }) + '\n');
}

// dHash barato: 9x8 escala de grises, compara pixeles adyacentes -> 64 bits.
async function dHash(buffer) {
  const { data } = await sharp(buffer)
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let hash = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = data[y * 9 + x];
      const right = data[y * 9 + x + 1];
      hash = (hash << 1n) | (left > right ? 1n : 0n);
    }
  }
  return hash;
}

function hammingDistance(a, b) {
  let x = a ^ b;
  let count = 0n;
  while (x) {
    count += x & 1n;
    x >>= 1n;
  }
  return Number(count);
}

// Filtro de estilo: el usuario quiere fotos de estudio con fondo blanco (no
// fotos de ambiente/cocina, ni imágenes con banners de marketing pegados
// encima). Heurística: redimensiona a 100x100, muestrea el ANILLO exterior
// (donde debería estar el fondo, no el producto que suele estar centrado) y
// exige que sea claro (mean alto) Y uniforme (std bajo) — una foto de cocina
// tiene mean más bajo y/o mucha variación de color en el borde.
// `.flatten({background:'#fff'})` es necesario: sin él, un PNG con canal
// alpha se lee como negro (0,0,0) en el buffer raw, rechazando por error
// fotos con fondo transparente que en realidad se verían blancas.
async function hasWhiteBackground(buffer) {
  const size = 100;
  const { data, info } = await sharp(buffer)
    .flatten({ background: '#ffffff' })
    .resize(size, size, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const b = WHITE_BG_BORDER_PX;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const isBorder = x < b || x >= size - b || y < b || y >= size - b;
      if (!isBorder) continue;
      const idx = (y * size + x) * ch;
      const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      sum += avg;
      sumSq += avg * avg;
      count++;
    }
  }
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  const std = Math.sqrt(Math.max(0, variance));
  return mean >= WHITE_BG_MIN_MEAN && std <= WHITE_BG_MAX_STD;
}

async function guestLogin() {
  const res = await fetch(`${GATEWAY_URL}/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const json = await res.json();
  if (!json?.guestToken) throw new Error('No se pudo obtener guestToken');
  return json.guestToken;
}

// Google bloquea con CAPTCHA desde la primera request automatizada (probado:
// ver README). Bing Images no lo hace y expone la URL real de la imagen
// (`murl`) en el atributo `m` (JSON) de cada `a.iusc` — patrón de scraping
// bien conocido, sin necesidad de clickear cada thumbnail. También devuelve
// el título (`m.t`) de cada resultado, necesario para el filtro de marca.
async function searchImageResults(page, query, limit) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  const results = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a.iusc'));
    return anchors
      .map((a) => {
        try {
          const m = JSON.parse(a.getAttribute('m'));
          return { murl: m.murl, title: m.t || '' };
        } catch {
          return null;
        }
      })
      .filter((r) => r && r.murl && r.murl.startsWith('http'));
  });
  return results.slice(0, limit);
}

// Filtro de relevancia: para marcas que son palabras genéricas del idioma
// (ej. "Consumer"), Bing rankea alto resultados de OTRAS marcas que matchean
// por las palabras del nombre del producto ("industrial", "pared", "30").
// Probado en vivo: exigir que el título de la página mencione la marca
// descarta esos falsos positivos (verificado con "VENTILADOR DE PARED
// CONSUMER INDUSTRIAL 30": de 8 candidatas sin filtro, solo 1 era
// realmente de la marca Consumer — el resto eran Kingsman/Home Depot/etc).
function isBrandRelevant(title, marca) {
  const m = (marca || '').trim().toLowerCase();
  if (!m) return true;
  return (title || '').toLowerCase().includes(m);
}

async function downloadImage(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Convierte a webp, bajando calidad hasta entrar en MAX_BYTES. Devuelve null
// si ni con calidad mínima entra.
async function toWebpUnder1MB(buffer) {
  for (let quality = 85; quality >= MIN_QUALITY; quality -= 10) {
    // flatten: banca un fondo blanco real en vez de dejar transparencia (evita
    // artefactos si el frontend no compone bien PNGs con canal alpha).
    const out = await sharp(buffer).flatten({ background: '#ffffff' }).webp({ quality }).toBuffer();
    if (out.length <= MAX_BYTES) return out;
  }
  return null;
}

async function pickDistinctImages(page, marca, nombre, needed) {
  // Marca entre comillas: fuerza a Bing a tratarla como frase (mejora algo el
  // ranking), pero el filtro real de relevancia es isBrandRelevant() sobre el
  // título — sin eso, marcas-palabra-genérica (ej. "Consumer") traen mayoría
  // de resultados de otras marcas.
  const query = `"${marca}" ${nombre}`.trim();
  const results = await searchImageResults(page, query, CANDIDATES_PER_PRODUCT);
  const relevant = results.filter((r) => isBrandRelevant(r.title, marca));
  if (process.env.DEBUG_SEARCH) {
    console.log(`  [debug] "${query}" -> ${results.length} crudos, ${relevant.length} tras filtro de marca`);
  }

  const chosen = []; // { buffer, hash }
  for (const { murl } of relevant) {
    if (chosen.length >= needed) break;
    try {
      const raw = await downloadImage(murl);
      if (!(await hasWhiteBackground(raw))) continue;
      const hash = await dHash(raw);
      const isDuplicate = chosen.some((c) => hammingDistance(c.hash, hash) < DHASH_MIN_DISTANCE);
      if (isDuplicate) continue;
      const webp = await toWebpUnder1MB(raw);
      if (!webp) continue;
      chosen.push({ buffer: webp, hash });
    } catch {
      // candidata rota/no descargable: se ignora y se prueba la siguiente
    }
  }
  return chosen.map((c) => c.buffer);
}

async function uploadImages(token, codigoArticulo, buffers, hasExisting) {
  const form = new FormData();
  buffers.forEach((buf, i) => {
    form.append('files', new Blob([buf], { type: 'image/webp' }), `${codigoArticulo}_${i}.webp`);
  });
  form.append('orden', '0');
  form.append('principal', hasExisting ? 'false' : 'true');

  const res = await fetch(`${GATEWAY_URL}/products/${codigoArticulo}/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
  return json;
}

async function main() {
  if (!fs.existsSync(WORKLIST_PATH)) {
    console.error(`No existe ${WORKLIST_PATH} — corré primero: node find-missing.js`);
    process.exit(1);
  }
  let worklist = JSON.parse(fs.readFileSync(WORKLIST_PATH, 'utf8'));
  const done = loadDoneCodes();
  worklist = worklist.filter((p) => !done.has(String(p.codigo_articulo)));
  if (LIMIT) worklist = worklist.slice(0, LIMIT);

  console.log(`Procesando ${worklist.length} productos (${done.size} ya hechos, se saltean)`);
  if (DRY_RUN) console.log('*** DRY RUN: no se sube nada, solo se descarga/convierte ***');

  const token = DRY_RUN ? null : await guestLogin();

  let browser = await puppeteer.launch({ headless: 'new' });
  let page = null;

  const USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

  // Bing degrada la sesión: probado en vivo que a partir del 2do request en
  // el MISMO browser context, los resultados siguen viniendo (mismo conteo
  // de anchors) pero sin el título poblado (`m.t` vacío) — el filtro de marca
  // los rechaza a todos. Un contexto de navegador nuevo (incógnito) por cada
  // búsqueda evita esto por completo (verificado: 4 productos que fallaban
  // en cascada dieron 34-35 resultados con título completo cada uno con
  // contexto fresco). Reemplaza el reciclado-cada-N-productos.
  let context = null;
  async function recreatePage() {
    try {
      if (context) await context.close().catch(() => {});
    } catch {
      // ignore
    }
    if (!browser.isConnected()) {
      try {
        await browser.close().catch(() => {});
      } catch {
        // ignore
      }
      browser = await puppeteer.launch({ headless: 'new' });
    }
    context = await browser.createBrowserContext();
    page = await context.newPage();
    await page.setUserAgent(USER_AGENT);
  }
  await recreatePage();

  for (const producto of worklist) {
    const { codigo_articulo, marca, nombre, needed, existing } = producto;

    // Contexto nuevo para CADA producto (ver nota arriba) — no solo cada N.
    await recreatePage();

    let attempt = 0;
    let lastError = null;
    let handled = false;
    while (attempt < 2 && !handled) {
      attempt++;
      try {
        const buffers = await pickDistinctImages(page, marca, nombre, needed);
        if (buffers.length === 0) {
          console.log(`[${codigo_articulo}] sin imágenes válidas — "${marca} ${nombre}"`);
          logResult({ codigo_articulo, status: 'error', uploaded: 0, message: 'sin candidatas válidas' });
        } else {
          if (!DRY_RUN) {
            await uploadImages(token, codigo_articulo, buffers, existing > 0);
          }
          console.log(`[${codigo_articulo}] OK — ${buffers.length}/${needed} imágenes — "${marca} ${nombre}"`);
          logResult({
            codigo_articulo,
            status: buffers.length >= needed ? 'ok' : 'partial',
            uploaded: buffers.length,
            message: '',
          });
        }
        handled = true;
      } catch (e) {
        lastError = e;
        if (isCrashError(e.message) && attempt < 2) {
          console.warn(`[${codigo_articulo}] crash de Puppeteer (${e.message}) — recreando page y reintentando…`);
          await recreatePage();
          continue;
        }
        console.error(`[${codigo_articulo}] ERROR: ${e.message}`);
        logResult({ codigo_articulo, status: 'error', uploaded: 0, message: e.message });
        handled = true;
      }
    }
    if (!handled && lastError) {
      logResult({ codigo_articulo, status: 'error', uploaded: 0, message: lastError.message });
    }
    await randomDelay();
  }

  await browser.close().catch(() => {});
  console.log('Listo. Ver results.log para el detalle.');
}

main().catch((e) => {
  console.error('ERROR FATAL:', e.message);
  process.exit(1);
});
