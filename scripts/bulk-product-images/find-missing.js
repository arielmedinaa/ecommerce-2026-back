// Cruza el catálogo real (DB externa ECONT) contra las imágenes ya cargadas
// (DB `ecommerce`, tabla productos_imagenes) y arma worklist.json con los
// productos que necesitan imágenes (excluye marca JOTA = código 257).
//
// Env vars (ver README.md):
//   ECONT_DB_HOST, ECONT_DB_PORT, ECONT_DB_USER, ECONT_DB_PASSWORD, ECONT_DB_DATABASE
//   ECOMMERCE_DB_HOST, ECOMMERCE_DB_PORT, ECOMMERCE_DB_USER, ECOMMERCE_DB_PASSWORD, ECOMMERCE_DB_DATABASE
//
// Uso: node find-missing.js [--limit N] [--min-images 3]

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const JOTA_MARCA_CODIGO = 257;

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}

const LIMIT = Number(argValue('--limit', '0')) || null;
const MIN_IMAGES = Number(argValue('--min-images', '3'));

async function main() {
  const econt = await mysql.createConnection({
    host: process.env.ECONT_DB_HOST || '192.168.100.100',
    port: Number(process.env.ECONT_DB_PORT || 3306),
    user: process.env.ECONT_DB_USER || 'root',
    password: process.env.ECONT_DB_PASSWORD || 'classicS',
    database: process.env.ECONT_DB_DATABASE || 'ssss_emp1',
  });

  const ecommerce = await mysql.createConnection({
    host: process.env.ECOMMERCE_DB_HOST || 'localhost',
    port: Number(process.env.ECOMMERCE_DB_PORT || 3307),
    user: process.env.ECOMMERCE_DB_USER || 'ecommerce',
    password: process.env.ECOMMERCE_DB_PASSWORD || 'ecommerce',
    database: process.env.ECOMMERCE_DB_DATABASE || 'ecommerce',
  });

  // Mismo filtro que usa el storefront para decidir qué mostrar (ver
  // proc_obtener_listado_articulos_ecommerce_v2 / contarProductosV2 en
  // microservices/products): baja=0 + web=1 + stock>0 en depósito habilitado.
  // `activo` NO determina visibilidad web (confirmado: combinarlo con estos
  // filtros da un conteo absurdamente bajo) — no filtrar por él.
  console.log('Consultando catálogo (ECONT)...');
  const [productos] = await econt.query(
    `SELECT a.codigo_articulo, a.nombre, m.nombre AS marca
     FROM articulo a
     JOIN marca m ON m.codigo = a.marca
     WHERE a.baja = 0 AND a.web = 1 AND a.marca <> ?
       AND EXISTS (
         SELECT 1 FROM tbl_stock_actual sa
         JOIN deposito d ON d.codigo = sa.deposito
         WHERE sa.codigo_articulo = a.codigo_articulo
           AND d.habilitado_reserva = 1 AND d.codigo <> 33
           AND sa.cantidad_actual > 0
       )
     ORDER BY a.codigo_articulo`,
    [JOTA_MARCA_CODIGO],
  );
  console.log(`  ${productos.length} productos candidatos (baja=0, web=1, con stock, sin JOTA)`);

  console.log('Consultando imágenes existentes (ecommerce.productos_imagenes)...');
  const [imagenes] = await ecommerce.query(
    `SELECT producto_codigo, COUNT(*) AS total
     FROM productos_imagenes
     WHERE activo = 1
     GROUP BY producto_codigo`,
  );
  const existentesPorCodigo = new Map(imagenes.map((r) => [String(r.producto_codigo), r.total]));

  let worklist = productos
    .map((p) => {
      const existing = existentesPorCodigo.get(String(p.codigo_articulo)) || 0;
      const needed = Math.max(0, MIN_IMAGES - existing);
      return {
        codigo_articulo: p.codigo_articulo,
        nombre: (p.nombre || '').trim(),
        marca: (p.marca || '').trim(),
        existing,
        needed,
      };
    })
    .filter((p) => p.needed > 0 && p.nombre);

  console.log(`  ${worklist.length} productos necesitan al menos 1 imagen nueva`);

  if (LIMIT) {
    worklist = worklist.slice(0, LIMIT);
    console.log(`  Recortado a --limit ${LIMIT}`);
  }

  const outPath = path.join(__dirname, 'worklist.json');
  fs.writeFileSync(outPath, JSON.stringify(worklist, null, 2));
  console.log(`Worklist guardada en ${outPath} (${worklist.length} productos)`);

  await econt.end();
  await ecommerce.end();
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
