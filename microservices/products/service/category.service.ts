import { Injectable } from "@nestjs/common";
import { Categoria } from "@products/schemas/category.schema";
import { CategoryDTO } from "@products/schemas/dto/category.dto";

@Injectable()
export class CategoryService {
    constructor() {}

    async createCategory(category: string): Promise<any> {
        const newCategory = new Categoria({ categoria: category });
        return await newCategory.save();
    }

    async getCategories(filter: CategoryDTO): Promise<any> {
        return await Categoria.find(filter);
    }
}