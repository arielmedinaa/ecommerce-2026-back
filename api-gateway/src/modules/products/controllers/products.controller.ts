import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

@Controller('products')
export class ProductsController {
  constructor(
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
  ) {}

  @Get()
  async getProducts() {
    try {
      const products = await firstValueFrom(
        this.productsClient.send({ cmd: 'get_products' }, {}).pipe(
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
}
