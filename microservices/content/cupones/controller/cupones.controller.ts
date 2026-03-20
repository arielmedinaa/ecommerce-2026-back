import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CuponesService } from '../service/cupones.service';

@Controller()
export class CuponesController {
  constructor(private readonly cuponesService: CuponesService) {}

  @MessagePattern({ cmd: 'crearCupon' })
  async crearCupon(@Payload() payload: any) {
    const { createCuponDto } = payload;
    return await this.cuponesService.crearCupon(createCuponDto);
  }

  @MessagePattern({ cmd: 'listarCupones' })
  async listarCupones(@Payload() payload: any) {
    const { page, limit, filters } = payload;
    return await this.cuponesService.obtenerTodos(page, limit, filters);
  }

  @MessagePattern({ cmd: 'validarCupon' })
  async validarCupon(@Payload() payload: any) {
    const { codigo, montoCarrito } = payload;
    return await this.cuponesService.validarCuponBase(codigo, montoCarrito);
  }

  @MessagePattern({ cmd: 'registrarUsoCupon' })
  async registrarUsoCupon(@Payload() payload: any) {
    const { codigo } = payload;
    return await this.cuponesService.registrarUsoCupon(codigo);
  }

  @MessagePattern({ cmd: 'desactivarCupon' })
  async desactivarCupon(@Payload() payload: any) {
    const { id } = payload;
    return await this.cuponesService.desactivarCupon(id);
  }
}
