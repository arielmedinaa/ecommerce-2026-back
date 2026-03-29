import { ConditionsService } from '../service/conditions.service';
export declare class ConditionsController {
    private readonly conditionsService;
    constructor(conditionsService: ConditionsService);
    createCondition(payload: any): Promise<{
        data: import("../../schemas/event-condition.schema").EventCondition;
        message: string;
        success: boolean;
    }>;
    findByEvent(payload: any): Promise<import("../../schemas/event-condition.schema").EventCondition[]>;
    listConditions(payload: any): Promise<{
        conditions: import("../../schemas/event-condition.schema").EventCondition[];
        total: number;
        pages: number;
    }>;
    deleteCondition(payload: any): Promise<{
        message: string;
    }>;
    toggleCondition(payload: any): Promise<import("../../schemas/event-condition.schema").EventCondition>;
}
