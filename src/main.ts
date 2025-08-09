import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ไม่ตั้งค่า global prefix เพื่อให้เส้นทางเป็นแบบตรง ๆ

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('BCEL gateway API')
    .setDescription('BCEL gateway - Authentication & Banking Gateway')
    .setVersion('1.0.0')
    // ไม่ fix server base URL เพื่อให้ Swagger ใช้ relative path ตรงกับแอป (ไม่มี /bcel-api)
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
  SwaggerModule.setup('doc', app, document, {
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

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Application is running on: http://localhost:${process.env.PORT ?? 3001}`);
  console.log(`📖 Swagger documentation: http://localhost:${process.env.PORT ?? 3001}/doc`);
}
bootstrap();