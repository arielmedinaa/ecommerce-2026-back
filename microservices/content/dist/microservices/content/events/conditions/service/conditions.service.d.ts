import { Repository } from 'typeorm';
import { EventCondition, ConditionType } from '../../schemas/event-condition.schema';
export declare class ConditionsService {
    private readonly conditionRepository;
    private readonly conditionRepositoryRead;
    private readonly logger;
    constructor(conditionRepository: Repository<EventCondition>, conditionRepositoryRead: Repository<EventCondition>);
    createCondition(evento_id: number, tipo: ConditionType, valor: string, activo?: boolean): Promise<{
        data: EventCondition;
        message: string;
        success: boolean;
    }>;
    findByEvent(evento_id: number): Promise<EventCondition[]>;
    findAll(page?: number, limit?: number, filters?: any): Promise<{
        conditions: EventCondition[];
        total: number;
        pages: number;
    }>;
    deleteCondition(id: number): Promise<void>;
    toggleCondition(id: number): Promise<EventCondition>;
}
