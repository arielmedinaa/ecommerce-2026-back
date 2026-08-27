import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { EtlProviderConfig } from '../types';

const CONFIG_DIR = path.join(__dirname, '..', 'config');

// Persiste el estado de cada integración generada como un archivo JSON por
// proveedor (`microservices/etl/config/<slug>.config.json`), tal como pide el
// usuario: "por nombre de proveedor". No requiere una base de datos propia
// para el microservicio `etl` (mantiene database-per-service intacto).
@Injectable()
export class EtlConfigStoreService {
  private readonly logger = new Logger(EtlConfigStoreService.name);

  constructor() {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  private filePath(slug: string): string {
    return path.join(CONFIG_DIR, `${slug}.config.json`);
  }

  save(config: EtlProviderConfig): void {
    fs.writeFileSync(this.filePath(config.slug), JSON.stringify(config, null, 2), 'utf-8');
  }

  getBySlug(slug: string): EtlProviderConfig | null {
    const file = this.filePath(slug);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  listAll(): EtlProviderConfig[] {
    if (!fs.existsSync(CONFIG_DIR)) return [];
    return fs
      .readdirSync(CONFIG_DIR)
      .filter((f) => f.endsWith('.config.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, f), 'utf-8')));
  }

  getByIdProveedor(idProveedor: number): EtlProviderConfig | null {
    return this.listAll().find((c) => c.idProveedor === idProveedor) || null;
  }

  slugify(nombre: string, idProveedor: number): string {
    const combiningMarks = new RegExp('[\\u0300-\\u036f]', 'g');
    const base = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(combiningMarks, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base ? `${base}-${idProveedor}` : `proveedor-${idProveedor}`;
  }
}
