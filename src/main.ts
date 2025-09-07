import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  process.env.TZ = "Asia/Bangkok";
  console.log("Current TZ:", process.env.TZ);
  console.log("Current time:", new Date().toISOString());
  console.log("Current local time:", new Date().toString());
  const app = await NestFactory.create(AppModule);

  // ไม่ตั้งค่า global prefix เพื่อให้เส้นทางเป็นแบบตรง ๆ

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle("Central Bank API")
    .setDescription("Central Bank API - Authentication & Banking Gateway")
    .setVersion("1.0.0")
    .addServer("https://central-dragon-11.com/bcel-api", "Production") // เพิ่ม server URL
    // ไม่ fix server base URL เพื่อให้ Swagger ใช้ relative path ตรงกับแอป (ไม่มี /bcel-api)
    .addApiKey(
      {
        type: "apiKey",
        name: "authorization",
        in: "header",
        description:
          "Enter your API Token (e.g., e3be4be5-dfb3-4d27-xxxx-f1b52e3c9f95)",
      },
      "API Token"
    )
    /* .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    ) */
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger documentation
  SwaggerModule.setup("doc", app, document, {
    customSiteTitle: "Central Bank API",
    customfavIcon: "/favicon.ico",
    customCss: ".swagger-ui .topbar { display: none }",
  });

  // เปิด CORS เพื่อให้ frontend สามารถเรียก API ได้
  app.enableCors({
    origin: true, // อนุญาตทุก origin (สำหรับ development)
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
  console.log(
    `🚀 Application is running on: http://localhost:${process.env.PORT ?? 3001}`
  );
  console.log(
    `📖 Swagger documentation: http://localhost:${process.env.PORT ?? 3001}/doc`
  );
}
bootstrap();
