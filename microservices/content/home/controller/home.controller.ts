import { Body, Controller, Post } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HomeService } from '@content/home/service/home.service';
import { FilterHomeDto } from '@content/home/dto/filter.home';
import { ResponseData } from '@response/response.data';
import { HomeData } from '@content/home/interfaces/home.interface';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Post('data')
  async getHomeData(@Body() filter: FilterHomeDto): Promise<ResponseData<HomeData>> {
    return this.homeService.getHomeData(filter);
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
