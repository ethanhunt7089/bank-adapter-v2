import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('bcel-api');

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('BCEL gateway API')
    .setDescription('BCEL gateway - Authentication & Banking Gateway')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Setup Swagger documentation
  SwaggerModule.setup('bcel-api/doc', app, document, {
    customSiteTitle: 'BCEL gateway API',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // เปิด CORS เพื่อให้ frontend สามารถเรียก API ได้
  app.enableCors({
    origin: true, // อนุญาตทุก origin (สำหรับ development)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`📖 Swagger documentation: http://localhost:${process.env.PORT ?? 3000}/bcel-api/doc`);
}
bootstrap();