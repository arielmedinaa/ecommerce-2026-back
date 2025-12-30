import { Body, Controller, Post } from '@nestjs/common';
import { HomeService } from '@home/service/home.service';
import { FilterHomeDto } from '@home/dto/filter.home';
import { ResponseData } from '@gateway/common/response/response.data';
import { HomeData } from '@home/interfaces/home.interface';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Post('data')
  async getHomeData(@Body() filter: FilterHomeDto): Promise<ResponseData<HomeData>> {
    return this.homeService.getHomeData(filter);
  }
}
