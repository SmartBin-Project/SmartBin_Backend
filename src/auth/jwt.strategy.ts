import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret =
      configService.get<string>('JWT_SECRET') || 'your_jwt_secret_key';
    super({
      // 1. Get the token from the "Authorization: Bearer <token>" header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // 2. Reject expired tokens immediately
      ignoreExpiration: false,

      // 3. SECURE: Load the secret from .env (Must match AuthModule)
      secretOrKey: secret,
    });
  }

  // This runs if the token is valid. The return value is added to request.user
  async validate(payload: any) {
    // Payload comes from the AuthService login method
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
