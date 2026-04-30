import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CuponesService } from '../service/cupones.service';
import { AsignarCuponesProductosDTO } from '../schemas/dto/asignar-cupones-productos.dto';

@Controller()
export class CuponesController {
  constructor(private readonly cuponesService: CuponesService) {}

  @MessagePattern({ cmd: 'crearCupon' })
  async crearCupon(@Payload() payload: any) {
    const createCuponDto = payload?.createCuponDto || payload;
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
    const { idCupon } = payload;
    return await this.cuponesService.registrarUsoCupon(idCupon);
  }

  @MessagePattern({ cmd: 'listarCuponId' })
  async obtenerCuponId(@Payload() payload: any){
    const { idCupon } = payload;
    return await this.cuponesService.obtenerPorId(idCupon);
  }

  @MessagePattern({ cmd: 'desactivarCupon' })
  async desactivarCupon(@Payload() payload: any) {
    const { id } = payload;
    return await this.cuponesService.desactivarCupon(id);
  }

  @MessagePattern({ cmd: 'obtenerCuponesPorProducto' })
  async obtenerCuponesPorProducto(@Payload() payload: any) {
    const { productId } = payload;
    return await this.cuponesService.obtenerCuponesPorProducto(productId);
  }

  @MessagePattern({ cmd: 'crearCuponPorProducto' })
  async crearCuponPorProducto(@Payload() payload: AsignarCuponesProductosDTO) {
    return await this.cuponesService.asignarCuponPorProducto(payload);
  }
  
  @MessagePattern({ cmd: 'desasignarCuponPorProducto' })
  async desasignarCuponPorProducto(@Payload() payload: AsignarCuponesProductosDTO) {
    return await this.cuponesService.desasignarCuponPorProducto(payload);
  }
}
