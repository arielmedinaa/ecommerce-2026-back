// Sube las imágenes de scripts/bulk-product-images/PRODUCT_IMAGES_DIR (por
// defecto la carpeta "PRODUCT IMAGES" del admin) al código de producto que
// indica cada nombre de archivo (ej. "10013.png" -> codigo_articulo 10013).
// Valida los códigos contra la DB real (ECONT, tabla articulo) antes de subir.
// Reusa el mismo endpoint que el admin (POST /api/products/:codigo/images),
// que ya exige .webp/<1MB — este script solo convierte a webp preservando
// la mayor calidad posible.
//
// Uso:
//   node upload-from-folder.js --dry-run [--limit 5]
//   node upload-from-folder.js
//
// Reanudable: results.log en este mismo directorio arrastra el estado del
// scraper de Bing (comparten formato {codigo_articulo, status}), así que este
// script escribe en su propio folder-results.log para no pisarlo.

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const sharp = require('sharp');

const IMAGES_DIR =
  process.env.PRODUCT_IMAGES_DIR ||
  path.join(__dirname, '..', '..', '..', 'admin-proveedor-ecommerce', 'frontend', 'PRODUCT IMAGES');
const GATEWAY_URL = process.env.GATEWAY_URL || 'https://ecommercebackv1.jjemp.com/api';
const MAX_BYTES = 1024 * 1024;
const START_QUALITY = Number(process.env.WEBP_QUALITY || 92);
const MIN_QUALITY = 60;
const DELAY_MS = 250;

const RESULTS_PATH = path.join(__dirname, 'folder-results.log');
const UNMATCHED_PATH = path.join(__dirname, 'folder-unmatched.json');

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}
const LIMIT = Number(argValue('--limit', '0')) || null;
const DRY_RUN = process.argv.includes('--dry-run');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadDoneCodes() {
  if (!fs.existsSync(RESULTS_PATH)) return new Set();
  const done = new Set();
  for (const line of fs.readFileSync(RESULTS_PATH, 'utf8').split('\n').filter(Boolean)) {
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

async function buildValidCodes() {
  const econt = await mysql.createConnection({
    host: process.env.ECONT_DB_HOST || '192.168.100.100',
    port: Number(process.env.ECONT_DB_PORT || 3306),
    user: process.env.ECONT_DB_USER || 'root',
    password: process.env.ECONT_DB_PASSWORD || 'classicS',
    database: process.env.ECONT_DB_DATABASE || 'ssss_emp1',
    ssl: false,
  });
  const [rows] = await econt.query('SELECT codigo_articulo FROM articulo WHERE baja = 0');
  await econt.end();
  return new Set(rows.map((r) => String(r.codigo_articulo)));
}

function scanFolder(validCodes) {
  const files = fs.readdirSync(IMAGES_DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  const byCode = new Map();
  const unmatched = [];

  for (const file of files) {
    const base = file.replace(/\.[a-zA-Z]+$/, '');
    const candidates = [...new Set(base.match(/\d+/g) || [])].filter((c) => validCodes.has(c));

    if (candidates.length === 0) {
      unmatched.push(file);
      continue;
    }

    for (const code of candidates) {
      const ext = path.extname(file).toLowerCase();
      const existing = byCode.get(code);
      if (!existing || (ext === '.webp' && path.extname(existing).toLowerCase() !== '.webp')) {
        byCode.set(code, file);
      }
    }
  }

  return { byCode, unmatched };
}

async function toWebp(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (path.extname(filePath).toLowerCase() === '.webp' && buffer.length <= MAX_BYTES) {
    return buffer;
  }
  for (let quality = START_QUALITY; quality >= MIN_QUALITY; quality -= 8) {
    const out = await sharp(buffer).flatten({ background: '#ffffff' }).webp({ quality }).toBuffer();
    if (out.length <= MAX_BYTES) return out;
  }
  return null;
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

async function getExistingCount(codigoArticulo) {
  const res = await fetch(`${GATEWAY_URL}/products/${codigoArticulo}/images`);
  if (!res.ok) return 0;
  const json = await res.json().catch(() => null);
  const list = Array.isArray(json) ? json : json?.data;
  return Array.isArray(list) ? list.length : 0;
}

async function uploadImage(token, codigoArticulo, buffer, principal) {
  const form = new FormData();
  form.append('files', new Blob([buffer], { type: 'image/webp' }), `${codigoArticulo}.webp`);
  form.append('orden', '0');
  form.append('principal', String(principal));

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
  console.log(`Carpeta de imágenes: ${IMAGES_DIR}`);
  console.log(`Gateway: ${GATEWAY_URL}`);
  if (DRY_RUN) console.log('*** DRY RUN: no se sube nada, solo se valida/convierte ***');

  console.log('Consultando códigos válidos (ECONT.articulo)...');
  const validCodes = await buildValidCodes();
  console.log(`  ${validCodes.size} códigos activos`);

  const { byCode, unmatched } = scanFolder(validCodes);
  fs.writeFileSync(UNMATCHED_PATH, JSON.stringify(unmatched, null, 2));
  console.log(`  ${byCode.size} códigos con imagen para subir, ${unmatched.length} archivos sin código válido (ver ${path.basename(UNMATCHED_PATH)})`);

  const done = loadDoneCodes();
  let entries = [...byCode.entries()].filter(([code]) => !done.has(code));
  if (LIMIT) entries = entries.slice(0, LIMIT);
  console.log(`Procesando ${entries.length} productos (${done.size} ya hechos, se saltean)`);

  let token = DRY_RUN ? null : await guestLogin();

  for (const [codigo, file] of entries) {
    const filePath = path.join(IMAGES_DIR, file);
    try {
      const webpBuffer = await toWebp(filePath);
      if (!webpBuffer) {
        console.error(`[${codigo}] no entra en 1MB ni con calidad mínima — ${file}`);
        logResult({ codigo_articulo: codigo, file, status: 'error', message: 'no cabe en 1MB' });
        continue;
      }

      if (DRY_RUN) {
        console.log(`[${codigo}] OK (dry-run) — ${file} -> ${webpBuffer.length} bytes`);
        logResult({ codigo_articulo: codigo, file, status: 'ok', bytes: webpBuffer.length, dryRun: true });
        continue;
      }

      const existingCount = await getExistingCount(codigo);
      let attempt = 0;
      while (true) {
        attempt++;
        try {
          await uploadImage(token, codigo, webpBuffer, existingCount === 0);
          break;
        } catch (e) {
          if (/401|token/i.test(e.message) && attempt < 2) {
            token = await guestLogin();
            continue;
          }
          throw e;
        }
      }

      console.log(`[${codigo}] OK — ${file} (${existingCount === 0 ? 'principal' : 'secundaria'})`);
      logResult({ codigo_articulo: codigo, file, status: 'ok', bytes: webpBuffer.length });
    } catch (e) {
      console.error(`[${codigo}] ERROR: ${e.message}`);
      logResult({ codigo_articulo: codigo, file, status: 'error', message: e.message });
    }
    await sleep(DELAY_MS);
  }

  console.log('Listo. Ver folder-results.log para el detalle.');
}

main().catch((e) => {
  console.error('ERROR FATAL:', e.message);
  process.exit(1);
});
