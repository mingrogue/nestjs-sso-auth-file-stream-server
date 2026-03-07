import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { StreamingModule } from './streaming.module';

async function bootstrap() {
  const logger = new Logger('StreamingService');
  
  const app = await NestFactory.create(StreamingModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));

  // CORS configuration
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:4200', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Range', 'If-None-Match', 'If-Modified-Since'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'ETag', 'Last-Modified'],
    credentials: true,
    maxAge: 86400,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>('STREAMING_PORT', 3002);
  await app.listen(port);

  logger.log(`Streaming service running on port ${port}`);
  logger.log(`Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
  logger.log(`CORS enabled for: ${frontendUrl}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start streaming service:', err);
  process.exit(1);
});
