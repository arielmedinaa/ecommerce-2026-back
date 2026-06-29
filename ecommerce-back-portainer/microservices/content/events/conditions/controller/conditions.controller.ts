import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ConditionsService } from '../service/conditions.service';
import { ConditionType } from '../../schemas/event-condition.schema';

@Controller()
export class ConditionsController {
  constructor(private readonly conditionsService: ConditionsService) {}

  @MessagePattern({ cmd: 'crearCondicionEvento' })
  async createCondition(@Payload() payload: any) {
    const { evento_id, tipo, valor, activo } = payload;
    return await this.conditionsService.createCondition(
      evento_id,
      tipo as ConditionType,
      valor,
      activo,
    );
  }

  @MessagePattern({ cmd: 'condicionesPorEvento' })
  async findByEvent(@Payload() payload: any) {
    const { evento_id } = payload;
    return await this.conditionsService.findByEvent(evento_id);
  }

  @MessagePattern({ cmd: 'listarCondiciones' })
  async listConditions(@Payload() payload: any) {
    const { page, limit, filters } = payload;
    return await this.conditionsService.findAll(page, limit, filters);
  }

  @MessagePattern({ cmd: 'eliminarCondicion' })
  async deleteCondition(@Payload() payload: any) {
    const { id } = payload;
    await this.conditionsService.deleteCondition(id);
    return { message: 'Condición eliminada exitosamente' };
  }

  @MessagePattern({ cmd: 'toggleCondicion' })
  async toggleCondition(@Payload() payload: any) {
    const { id } = payload;
    return await this.conditionsService.toggleCondition(id);
  }
}
