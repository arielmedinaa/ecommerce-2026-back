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
        return this.verticalesService.findAll(payload);
    }

    @MessagePattern({ cmd: 'getVerticalById' })
    async getVerticalById(@Payload() payload: any) {
        const { id } = payload;
        return this.verticalesService.findOne(id);
    }

    @MessagePattern({ cmd: 'updateVertical' })
    async updateVertical(@Payload() payload: any) {
        const { id, vertical } = payload;
        return this.verticalesService.update(Number(id), vertical);
    }

    @MessagePattern({ cmd: 'deleteVertical' })
    async deleteVertical(@Payload() payload: any) {
        const { id } = payload;
        return this.verticalesService.remove(Number(id));
    }

}

