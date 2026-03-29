import { VerticalesService } from "../service/verticales.service";
export declare class VerticalController {
    private readonly verticalesService;
    constructor(verticalesService: VerticalesService);
    createVertical(payload: any): Promise<{
        data: import("../schemas/verticales.schemas").Vertical;
        message: string;
        success: boolean;
    }>;
    getAllVerticales(payload: any): Promise<{
        data: import("../schemas/verticales.schemas").Vertical[];
        message: string;
        success: boolean;
        total?: number;
    }>;
    getVerticalById(payload: any): Promise<{
        data: import("../schemas/verticales.schemas").Vertical;
        message: string;
        success: boolean;
    }>;
}
