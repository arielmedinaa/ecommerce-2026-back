import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface FallbackProduct {
  codigo: string;
  nombre: string;
  precio: number;
  venta: number;
  ruta: string;
  imagenes: Array<{ url: { [key: string]: string } }>;
  descuento?: number;
  categorias?: Array<{ nombre: string }>;
}

export interface FallbackHomeData {
  productos: FallbackProduct[];
  categorias: string[];
  banners: Array<{
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    url: string;
    order: number;
  }>;
}

@Injectable()
export class FallbackDataService {
  private readonly logger = new Logger(FallbackDataService.name);
  private readonly fallbackDataPath = join(process.cwd(), 'fallback-data.json');

  constructor() {
    this.initializeFallbackData();
  }

  private initializeFallbackData() {
    if (!existsSync(this.fallbackDataPath)) {
      const defaultFallbackData: FallbackHomeData = {
        productos: this.getDefaultProducts(),
        categorias: ['Electrónica', 'Ropa', 'Hogar', 'Deportes'],
        banners: this.getDefaultBanners(),
      };
      this.saveFallbackData(defaultFallbackData);
    }
  }

  private getDefaultProducts(): FallbackProduct[] {
    return [
      {
        codigo: 'DEFAULT001',
        nombre: 'Producto Popular',
        precio: 50000,
        venta: 45000,
        ruta: 'producto-popular',
        imagenes: [
          {
            url: {
              '300': 'https://via.placeholder.com/300x300/cccccc/000000?text=Producto+1',
            },
          },
        ],
        descuento: 10,
        categorias: [{ nombre: 'Electrónica' }],
      },
      {
        codigo: 'DEFAULT002',
        nombre: 'Oferta Especial',
        precio: 75000,
        venta: 60000,
        ruta: 'oferta-especial',
        imagenes: [
          {
            url: {
              '300': 'https://via.placeholder.com/300x300/cccccc/000000?text=Producto+2',
            },
          },
        ],
        descuento: 20,
        categorias: [{ nombre: 'Ropa' }],
      },
      {
        codigo: 'DEFAULT003',
        nombre: 'Producto Nuevo',
        precio: 100000,
        venta: 95000,
        ruta: 'producto-nuevo',
        imagenes: [
          {
            url: {
              '300': 'https://via.placeholder.com/300x300/cccccc/000000?text=Producto+3',
            },
          },
        ],
        descuento: 5,
        categorias: [{ nombre: 'Hogar' }],
      },
    ];
  }

  private getDefaultBanners() {
    return [
      {
        id: '1',
        title: 'Bienvenidos',
        description: 'Las mejores ofertas te esperan',
        imageUrl: 'https://via.placeholder.com/1200x400/cccccc/000000?text=Bienvenidos',
        url: '/',
        order: 1,
      },
      {
        id: '2',
        title: 'Promociones',
        description: 'Hasta 50% de descuento',
        imageUrl: 'https://via.placeholder.com/1200x400/cccccc/000000?text=Promociones',
        url: '/promos',
        order: 2,
      },
    ];
  }

  getFallbackHomeData(): FallbackHomeData {
    try {
      if (existsSync(this.fallbackDataPath)) {
        const data = readFileSync(this.fallbackDataPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      this.logger.error('Error reading fallback data:', error);
    }
    
    return {
      productos: this.getDefaultProducts(),
      categorias: ['Electrónica', 'Ropa', 'Hogar', 'Deportes'],
      banners: this.getDefaultBanners(),
    };
  }

  getFallbackProducts(limit: number = 6): FallbackProduct[] {
    const data = this.getFallbackHomeData();
    return data.productos.slice(0, limit);
  }

  getFallbackCategories(): string[] {
    const data = this.getFallbackHomeData();
    return data.categorias;
  }

  getFallbackBanners() {
    const data = this.getFallbackHomeData();
    return data.banners;
  }

  updateFallbackData(newData: Partial<FallbackHomeData>) {
    try {
      const currentData = this.getFallbackHomeData();
      const updatedData = { ...currentData, ...newData };
      this.saveFallbackData(updatedData);
      this.logger.log('Fallback data updated successfully');
    } catch (error) {
      this.logger.error('Error updating fallback data:', error);
    }
  }

  private saveFallbackData(data: FallbackHomeData) {
    try {
      writeFileSync(this.fallbackDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      this.logger.error('Error saving fallback data:', error);
    }
  }

  saveSuccessfulResponse(data: any, type: 'products' | 'categories') {
    try {
      const currentData = this.getFallbackHomeData();
      
      if (type === 'products' && data.data) {
        currentData.productos = data.data.slice(0, 10);
      } else if (type === 'categories' && data.categorias) {
        currentData.categorias = data.categorias;
      }
      
      this.saveFallbackData(currentData);
      this.logger.log(`Saved successful ${type} response to fallback`);
    } catch (error) {
      this.logger.error(`Error saving ${type} to fallback:`, error);
    }
  }
}
