// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:3000',  // Your frontend origin
    credentials: true,                // ALLOW credentials (cookies)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Authorization,Content-Type',
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
