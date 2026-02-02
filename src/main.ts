import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import * as path from 'path';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 2. Connect the MQTT Microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      // url: process.env.MQTT_URL || 'mqtt://broker.emqx.io:1883',
      // // If using authentication:
      // username: process.env.MQTT_USERNAME || 'your_user',
      // password: process.env.MQTT_PASSWORD || 'your_password',

      // protocolId: 'mqtts',

      url: 'mqtt://test.mosquitto.org:1883',
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.enableCors({
    origin: [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'https://smartbin.cheangseyha2208.workers.dev',
      'https://smartbinkh.gic26.tech',
      'https://smartbin.gic26.tech',
      'https://api.gic26.tech',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    // allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // 3. Start both HTTP and Microservices
  await app.startAllMicroservices();

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
