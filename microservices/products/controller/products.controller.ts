import { Body, Controller, Logger } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { ProductsService } from "@products/service/products.service";

@Controller()
export class ProductsController {
    private readonly logger = new Logger(ProductsController.name);
    constructor(private readonly productsService: ProductsService) {}

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
}
