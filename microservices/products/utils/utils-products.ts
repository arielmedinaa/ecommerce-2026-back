import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../schemas/product.schemas';
import { Repository } from 'typeorm';

@Injectable()
export class ProductsUtils {
  private readonly logger = new Logger(ProductsUtils.name);
  constructor(
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly productReadRepository: Repository<Product>,
  ) {}

  async calculoCreditoProductos(products: any[]) {
    if (!Array.isArray(products)) {
      this.logger.error('Error: products no es un array:', products);
      return products;
    }

    const cuotas = await this.productReadRepository.query(
      'SELECT * FROM cuota ORDER BY cuota',
    );

    return products.map((product: any) => {
      const precioVenta = parseFloat(product.precioventa);
      let precioVentaRedondeado = precioVenta;
      if (precioVenta % 1000 !== 0) {
        precioVentaRedondeado = Math.ceil(precioVenta / 1000) * 1000;
      }

      const cuotasCalculadas = cuotas.map((cuota: any) => {
        const cuotaNumero = cuota.cuota;
        const incremento = parseFloat(cuota.incremento);
        let precioConRecargo =
          precioVentaRedondeado + (precioVentaRedondeado * incremento) / 100;

        if (precioConRecargo % 1000 !== 0) {
          precioConRecargo = Math.ceil(precioConRecargo / 1000) * 1000;
        }

        return {
          cuota: cuotaNumero,
          incremento: incremento,
          precio: precioConRecargo,
          precioFormateado: precioConRecargo.toFixed(0),
        };
      });

      return {
        ...product,
        precioventaRedondeado: precioVentaRedondeado,
        cuotas: cuotasCalculadas,
      };
    });
  }

  async calculoCreditoProductosOferta(productos: any[]) {
    if (!Array.isArray(productos)) {
      this.logger.error('Error: productos no es un array:', productos);
      return productos;
    }

    const cuotas = await this.productReadRepository.query(
      'SELECT * FROM cuota ORDER BY cuota'
    );

    return productos.map((producto: any) => {
      const precioContado = parseFloat(producto.precioContado);
      let precioContadoRedondeado = precioContado;
      if (precioContado % 1000 !== 0) {
        precioContadoRedondeado = Math.ceil(precioContado / 1000) * 1000;
      }

      const cuotasCalculadas = cuotas.map((cuota: any) => {
        const cuotaNumero = cuota.cuota;
        const incremento = parseFloat(cuota.incremento);
        let precioConRecargo = precioContadoRedondeado + (precioContadoRedondeado * incremento / 100);
        
        if (precioConRecargo % 1000 !== 0) {
          precioConRecargo = Math.ceil(precioConRecargo / 1000) * 1000;
        }
        
        return {
          cuota: cuotaNumero,
          incremento: incremento,
          precio: precioConRecargo,
          precioFormateado: precioConRecargo.toFixed(0)
        };
      });

      return {
        ...producto,
        precioContadoRedondeado: precioContadoRedondeado,
        cuotas: cuotasCalculadas
      };
    });
  }
}
