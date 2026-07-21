// Ad-hoc: guarda a disco las imágenes elegidas para un producto, para
// inspección visual manual (no forma parte del pipeline final).
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const fs = require('fs');

const query = process.argv[2] || 'KARCHER HIDROLAVADORA K5 145BAR 1900W';

async function main() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  );
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  const urls = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a.iusc'));
    return anchors
      .map((a) => {
        try {
          return JSON.parse(a.getAttribute('m')).murl;
        } catch {
          return null;
        }
      })
      .filter((src) => src && src.startsWith('http'));
  });
  console.log(`${urls.length} candidatas encontradas`);

  fs.mkdirSync('debug-preview', { recursive: true });
  let saved = 0;
  for (const u of urls.slice(0, 8)) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const raw = Buffer.from(await res.arrayBuffer());
      const webp = await sharp(raw).webp({ quality: 80 }).toBuffer();
      fs.writeFileSync(`debug-preview/${saved}.webp`, webp);
      console.log(`guardada debug-preview/${saved}.webp (${(webp.length / 1024).toFixed(0)}KB) <- ${u}`);
      saved++;
    } catch (e) {
      console.log(`fallo: ${u} (${e.message})`);
    }
  }
  await browser.close();
}

main().catch((e) => console.error('ERROR', e.message));
