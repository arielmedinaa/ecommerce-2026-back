import { NestFactory } from "@nestjs/core";
import { ImageModule } from "./image.module";
import { ConfigService } from "@nestjs/config";
import { Transport } from "@nestjs/microservices";
import { SERVICE_PORTS } from "@shared/config/microservice/microservice.config"; 

async function bootstrap() {
    const app = await NestFactory.create(ImageModule);
    const configService = app.get(ConfigService);
    const port = configService.get<number>('IMAGE_PORT', SERVICE_PORTS.IMAGE);

    app.enableCors({
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    app.connectMicroservice({
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: port,
      },
    });

    await app.startAllMicroservices();
    
    const httpPort = process.env.IMAGE_HTTP_PORT || 4093;
    await app.listen(httpPort, '0.0.0.0');
    
    console.log(`Image microservice running on TCP port ${port}`);
    console.log(`HTTP server listening on port ${httpPort}`);
    console.log(`Image endpoints available at: http://localhost:${httpPort}/controllerImageApi/image/`);
}

bootstrap().catch(err => {
    console.error('Error al iniciar el servicio de imágenes:', err);
    process.exit(1);
});