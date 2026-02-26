import { CategoryDTO } from "@products/schemas/dto/category.dto";
export declare class CategoryService {
    constructor();
    createCategory(category: string): Promise<any>;
    getCategories(filter: CategoryDTO): Promise<any>;
}
