import { readFileSync } from 'fs';
import { join } from 'path';
import { LOGO_CID } from './mail-transport.service';

const ASSETS_DIR = join(__dirname, '..', 'assets');
const LOGO_URL = `cid:${LOGO_CID}`;

function fillPlaceholders(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`{{${key}}}`).join(value ?? ''),
    template,
  );
}

export function renderTemplate(
  templateName: string,
  vars: Record<string, string>,
  title: string,
): string {
  const contentTemplate = readFileSync(join(ASSETS_DIR, `${templateName}.html`), 'utf-8');
  const content = fillPlaceholders(contentTemplate, vars);
  const baseTemplate = readFileSync(join(ASSETS_DIR, 'base.html'), 'utf-8');
  return fillPlaceholders(baseTemplate, { title, logoUrl: LOGO_URL, content });
}

export function renderItemsRows(
  items: { nombre: string; cantidad: number; precio: number }[],
): string {
  return items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;">${item.nombre}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;text-align:center;">${item.cantidad}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1a1a1a;text-align:right;">${formatGs(item.precio)}</td>
      </tr>`,
    )
    .join('');
}

export function formatGs(n: number): string {
  return `Gs. ${Math.round(n || 0).toLocaleString('es-PY')}`;
}
