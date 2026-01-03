import { Controller, Get, Inject, Post, Body } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
  ) {}

  @Post()
  async getProducts(
    @Body() filters: { limit: 4; offset: 0; categorias?: string },
  ) {
    try {
      const products = await firstValueFrom(
        this.productsClient.send({ cmd: 'get_products' }, filters).pipe(
          timeout(5000),
          catchError((error) => {
            console.error('Error in productsClient.send:', {
              message: error.message,
              name: error.name,
              stack: error.stack,
              code: error.code,
            });
            throw error;
          }),
        ),
      );
      return products;
    } catch (error) {
      console.error('Error in getProducts:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      throw new Error('Error al obtener los productos: ' + error.message);
    }
  }

  @Post('/listar/promos')
  async getProductosByPromos(
    @Body() filters: { limit: 10; offset: 0; promoDesc?: string },
  ) {
    try {
      const productosPromos = await firstValueFrom(
        this.productsClient.send({ cmd: 'get_products_by_promos' }, filters),
      );
      return productosPromos;
    } catch (error) {
      console.error('Error in getProductosByPromos:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      throw new Error(
        'Error al obtener los productos con promos: ' + error.message,
      );
    }
  }

  @Post('/searchProducts')
  async searchProducts(@Body() filters: any = { limit: 4, offset: 0 }) {
    try {
      const productos = await firstValueFrom(
        this.productsClient.send({ cmd: 'search_products' }, filters)
      )
      return productos;
    } catch (error) {
      console.error('Error in searchProducts:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
      });
      throw new Error(
        'Error al buscar los productos: ' + error.message,
      );
    }
  }
}
