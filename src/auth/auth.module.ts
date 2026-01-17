import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminSchema } from 'src/schema/admin.schema';
import { SuperAdminSchema } from 'src/schema/superadmin.schema';
import { OtpSchema } from 'src/schema/otp.schema';
import { EmailService } from 'src/email/email.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    MongooseModule.forFeature([
      { name: 'Admin', schema: AdminSchema },
      { name: 'SuperAdmin', schema: SuperAdminSchema },
      { name: 'Otp', schema: OtpSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') || 'your_jwt_secret_key',
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],

  controllers: [AuthController],
  providers: [AuthService, EmailService, JwtStrategy],
  exports: [PassportModule, JwtStrategy],
})
export class AuthModule {}
