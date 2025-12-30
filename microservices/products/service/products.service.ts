import { Injectable, NotFoundException } from "@nestjs/common";
import { Product } from "@products/schemas/product.schema";
import { CreateProductDto } from "@products/schemas/dto/create-product.dto";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class ProductsService {
    constructor(
        @InjectModel(Product.name) private readonly productModel: Model<Product>
    ) {}

    async findAll(limit: number = 10, offset: number = 0, filters: any = {}): Promise<{data: Product[], total: number}> {
        const query: any = { estado: { $ne: 0 } };

        if (filters.categoria) {
            query['categorias._id'] = filters.categoria;
        }
        if (filters.subcategoria) {
            query['subcategorias._id'] = filters.subcategoria;
        }
        if (filters.precioMin || filters.precioMax) {
            query.venta = {};
            if (filters.precioMin) query.venta.$gte = Number(filters.precioMin);
            if (filters.precioMax) query.venta.$lte = Number(filters.precioMax);
        }
        if (filters.search) {
            query.$or = [
                { nombre: { $regex: filters.search, $options: 'i' } },
                { descripcion: { $regex: filters.search, $options: 'i' } },
                { codigo: filters.search }
            ];
        }
        const [data, total] = await Promise.all([
            this.productModel.find(query)
                .sort({ prioridad: -1, _id: 1 })
                .skip(Number(offset))
                .limit(Number(limit))
                .lean(),
            this.productModel.countDocuments(query)
        ]);

        return { data, total };
    }

    async findOne(id: string): Promise<Product> {
        const product = await this.productModel.findOne({ 
            _id: id,
            estado: { $ne: 0 } 
        }).lean();

        if (!product) {
            throw new NotFoundException(`Producto con ID ${id} no encontrado`);
        }

        return product;
    }

    async findByCode(codigo: string): Promise<Product | null> {
        return this.productModel.findOne({ 
            codigo,
            estado: { $ne: 0 } 
        }).lean();
    }

    async create(createProductDto: CreateProductDto): Promise<Product> {
        const createdProduct = new this.productModel({
            ...createProductDto,
            estado: 1,
            fecha_creacion: new Date(),
            fecha_actualizacion: new Date()
        });
        return createdProduct.save();
    }

    async update(id: string, updateProductDto: CreateProductDto): Promise<Product> {
        const updatedProduct = await this.productModel.findByIdAndUpdate(
            id,
            {
                ...updateProductDto,
                fecha_actualizacion: new Date()
            },
            { new: true }
        ).lean();

        if (!updatedProduct) {
            throw new NotFoundException(`Producto con ID ${id} no encontrado`);
        }

        return updatedProduct;
    }

    async remove(id: string): Promise<{ success: boolean }> {
        const result = await this.productModel.findByIdAndUpdate(
            id,
            { estado: 0, fecha_actualizacion: new Date() },
            { new: true }
        );

        if (!result) {
            throw new NotFoundException(`Producto con ID ${id} no encontrado`);
        }

        return { success: true };
    }

    async updateStock(id: string, cantidad: number, operacion: 'increment' | 'decrement' = 'increment'): Promise<Product> {
        const update = operacion === 'increment' 
            ? { $inc: { cantidad } } 
            : { $inc: { cantidad: -cantidad } };

        const product = await this.productModel.findByIdAndUpdate(
            id,
            {
                ...update,
                fecha_actualizacion: new Date(),
                dias_ultimo_movimiento: 0
            },
            { new: true }
        ).lean();

        if (!product) {
            throw new NotFoundException(`Producto con ID ${id} no encontrado`);
        }

        return product;
    }

    async getProductsByIds(ids: string[]): Promise<Product[]> {
        return this.productModel.find({
            _id: { $in: ids },
            estado: { $ne: 0 }
        }).lean();
    }

    async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
        return this.productModel.find({ 
            estado: 1,
            web: 1,
            cantidad: { $gt: 0 }
        })
        .sort({ prioridad: -1, _id: 1 })
        .limit(limit)
        .lean();
    }

    async getProductsByCategory(categoryId: string, limit: number = 10, offset: number = 0) {
        const [data, total] = await Promise.all([
            this.productModel.find({ 
                'categorias._id': categoryId,
                estado: 1,
                web: 1
            })
            .sort({ prioridad: -1, _id: 1 })
            .skip(Number(offset))
            .limit(Number(limit))
            .lean(),
            this.productModel.countDocuments({ 
                'categorias._id': categoryId,
                estado: 1,
                web: 1
            })
        ]);

        return { data, total };
    }
}