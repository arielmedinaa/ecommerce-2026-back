import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { LandingsController } from "./controller/landings.controller";
import { LandingsService } from "./service/landings.service";
import { LandingValidationService } from "./service/landings.service.spec";
import { LandingErrorService } from "./service/errors/landings-error.service";
import { MicroserviceModule } from "@shared/config/microservice/microservice.module";
import { Landing, LandingSchema } from "./schemas/landings.schemas";
import { Formato, FormatoSchema } from "./schemas/formatos.schema";
import { LandingError, LandingErrorSchema } from "./schemas/errors/landings.error.schema";

@Module({
    imports: [
        MicroserviceModule.register('CONTENT'),
        MongooseModule.forFeature([
            { name: Landing.name, schema: LandingSchema },
            { name: Formato.name, schema: FormatoSchema },
            { name: LandingError.name, schema: LandingErrorSchema },
        ])
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