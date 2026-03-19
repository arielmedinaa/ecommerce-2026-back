import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { VerticalesService } from "../service/verticales.service";

@Controller()
export class VerticalController {
    constructor(private readonly verticalesService: VerticalesService) {}

    @MessagePattern({ cmd: 'createVertical' })
    async createVertical(@Payload() payload: any) {
        const { vertical } = payload;
        return this.verticalesService.create(vertical);
    }

    @MessagePattern({ cmd: 'getAllVerticales' })
    async getAllVerticales(@Payload() payload: any) {
        const { filters } = payload;
        return this.verticalesService.findAll(filters);
    }

    @MessagePattern({ cmd: 'getVerticalById' })
    async getVerticalById(@Payload() payload: any) {
        const { id } = payload;
        return this.verticalesService.findOne(id);
    }
    
}


//{$and:[{estado:1},{imagenes:{$ne:[]}},{cantidad:{$gt:0}},{dias_ultimo_movimiento:{$lt:30}},{web:1},{precio:{$gt:9000}},{$or:[{'marca.nombre':'Midea'},{'marca.nombre':'Carrier'},{'marca.nombre':'Dako'},{'marca.nombre':'Bandeirante'}]}]}

//{$and:[{estado:1},{imagenes:{$ne:[]}},{cantidad:{$gt:0}},{dias_ultimo_movimiento:{$lt:30}},{web:1},{precio:{$gt:9000}},{$or:[{'marca.nombre':'Ariete'},{'marca.nombre':'DeLonghi'},{'marca.nombre':'Gama'},{'marca.nombre':'Parlux'},{'marca.nombre':'Severin'}]}]}