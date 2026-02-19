import { Body, Controller, Post, Get, Query, UseInterceptors } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HomeService } from '@content/home/service/home.service';
import { FilterHomeDto } from '@content/home/dto/filter.home';
import { ResponseData } from '@response/response.data';
import { HomeData } from '@content/home/interfaces/home.interface';
import { MicroserviceErrorInterceptor } from '@shared/common/interceptors/microservice-error.interceptor';

@Controller('home')
@UseInterceptors(MicroserviceErrorInterceptor)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Post('data')
  async getHomeData(@Body() filter: FilterHomeDto): Promise<ResponseData<HomeData>> {
    return this.homeService.getHomeData(filter);
  }

  @Get()
  async getHomeDataQuery(@Query() filter: FilterHomeDto): Promise<ResponseData<HomeData>> {
    return this.homeService.getHomeData(filter);
  }

  @Get('health')
  async healthCheck() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'content-home',
    };
  }

  @MessagePattern({ cmd: 'get_home_content' })
  async getHomeContent(@Payload() payload: any) {
    try {
      const filter: FilterHomeDto = {
        limit: payload.limit,
        offset: payload.offset,
      };
      return await this.homeService.getHomeData(filter);
    } catch (error) {
      console.error('Error in getHomeContent:', error);
      throw error;
    }
  }
}
