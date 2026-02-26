import { ClientProxy } from '@nestjs/microservices';
import { FilterHomeDto } from '@content/home/dto/filter.home';
import { HomeData } from '@content/home/interfaces/home.interface';
import { ResponseData } from '@gateway/src/common/response/response.data';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
import { FallbackDataService } from '@shared/common/services/fallback-data.service';
export declare class HomeService {
    private readonly resilientService;
    private readonly fallbackDataService;
    private readonly productsClient;
    private readonly imageClient;
    private readonly logger;
    private fieldsImage;
    constructor(resilientService: ResilientService, fallbackDataService: FallbackDataService, productsClient: ClientProxy, imageClient: ClientProxy);
    private homeDataCache;
    private readonly HOME_TTL;
    getHomeData(filter: FilterHomeDto): Promise<ResponseData<HomeData>>;
}
