import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EtlAgentService } from '../service/etl-agent.service';

@Controller()
export class EtlController {
  constructor(private readonly etlAgentService: EtlAgentService) {}

  @MessagePattern({ cmd: 'generate_etl_integration' })
  generateEtlIntegration(@Payload() data: { idProveedor: number; email: string }) {
    return this.etlAgentService.generate(data.idProveedor, data.email);
  }

  @MessagePattern({ cmd: 'get_etl_status' })
  getEtlStatus(@Payload() data: { idProveedor: number }) {
    return this.etlAgentService.getStatus(data.idProveedor);
  }
}
