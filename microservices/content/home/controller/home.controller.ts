import { Body, Controller, Post } from '@nestjs/common';
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
}
