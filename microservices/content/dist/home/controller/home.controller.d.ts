import { HomeService } from '@content/home/service/home.service';
import { FilterHomeDto } from '@content/home/dto/filter.home';
import { ResponseData } from '@shared/common/response/response.data';
import { HomeData } from '@content/home/interfaces/home.interface';
export declare class HomeController {
    private readonly homeService;
    constructor(homeService: HomeService);
    getHomeData(filter: FilterHomeDto): Promise<ResponseData<HomeData>>;
    getHomeDataQuery(filter: FilterHomeDto): Promise<ResponseData<HomeData>>;
    healthCheck(): Promise<{
        status: string;
        timestamp: string;
        service: string;
    }>;
    getHomeContent(payload: any): Promise<any>;
}
