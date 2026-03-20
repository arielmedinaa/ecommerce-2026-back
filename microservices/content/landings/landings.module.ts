import { Module } from "@nestjs/common";
import { MariaDbModule } from "../config/mariadb.module";
import { LandingsController } from "./controller/landings.controller";
import { LandingsService } from "./service/landings.service";
import { LandingValidationService } from "./service/landings.service.spec";
import { LandingErrorService } from "./service/errors/landings-error.service";
import { MicroserviceModule } from "@shared/config/microservice/microservice.module";

@Module({
    imports: [
        MicroserviceModule.register('CONTENT'),
        MariaDbModule.forFeature(),
        MariaDbModule.forFeatureRead(),
    ],
    controllers: [LandingsController],
    providers: [
        LandingsService,
        LandingValidationService,
        LandingErrorService,
    ],
    exports: [
        LandingsService,
        LandingValidationService,
        LandingErrorService,
    ],
})
export class LandingsModule {}