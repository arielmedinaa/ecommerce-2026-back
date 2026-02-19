import { Body, Controller, Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CreateProductDto } from '@products/schemas/dto/create-product.dto';
import { ProductsService } from '@products/service/products.service';
import { Product } from '@products/schemas/product.schema';
import { CreateComboDto } from '@products/schemas/dto/create-combo.dto';
import { Combos } from '@products/schemas/combos.schema';

@Controller()
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);
  constructor(private readonly productsService: ProductsService) {}

  @MessagePattern({ cmd: 'createProducts' })
  public createProduct (createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @MessagePattern({ cmd: 'createCombo' })
  public createCombo (createComboDto: CreateComboDto): Promise<Combos> {
    return this.productsService.createCombo(createComboDto);
  }

  @MessagePattern({ cmd: 'get_products' })
  async findAll(@Body() filters: { offset: number; limit: number }) {
    try {
      const products = await this.productsService.findAll(filters);
      return products;
    } catch (error) {
      this.logger.error('Error in get_products:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'get_products_by_promos' })
  async findByPromos(filters: any = {}) {
    try {
      return await this.productsService.findByPromos(filters);
    } catch (error) {
      this.logger.error('Error in findByPromos:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'search_products' })
  async searchProducts(filters: any = {}) {
    try {
      return await this.productsService.searchProducts(filters);
    } catch (error) {
      this.logger.error('Error in searchProducts:', error);
      throw error;
    }
  }

  @MessagePattern({ cmd: 'search_combo_by_codigo' })
  async searchComboByCodigo(codigo: string) {
    return await this.productsService.findComboByCodigo(codigo);
  }

  @MessagePattern({ cmd: 'get_categories' })
  async getCategories() {
    try {
      return await this.productsService.getCategories();
    } catch (error) {
      this.logger.error('Error in get_categories:', error);
      throw error;
    }
  }
}
