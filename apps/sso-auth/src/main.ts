import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SsoAuthModule } from './sso-auth.module';

async function bootstrap() {
  const app = await NestFactory.create(SsoAuthModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: ['http://localhost:4200', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  });

  const port = process.env.SSO_AUTH_PORT || 3001;
  await app.listen(port);
  console.log(`SSO Auth service is running on port ${port}`);
}
bootstrap();
