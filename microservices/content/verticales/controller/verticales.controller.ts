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

    @MessagePattern({ cmd: 'upload_vertical_logo' })
    async uploadVerticalLogo(@Payload() payload: any) {
        const { id, file } = payload;
        return this.verticalesService.uploadLogo(Number(id), file);
    }

    @MessagePattern({ cmd: 'get_vertical_logo_file' })
    async getVerticalLogoFile(@Payload() payload: any) {
        const { nombreSanitizado, fileName } = payload;
        return this.verticalesService.getLogoFile(nombreSanitizado, fileName);
    }

}

