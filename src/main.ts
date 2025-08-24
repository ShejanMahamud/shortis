import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('/v1/api/');
  const config = new DocumentBuilder()
    .setTitle('Shortis API')
    .setDescription('API documentation for the Shortis application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v1/api/docs', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
