import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto'; // Use built-in crypto lib
import { Model } from 'mongoose';

import { EmailService } from 'src/email/email.service';
import { RegisterDTO } from './dto/create-auth.dto';
import { LoginDTO } from './dto/login-auth.dto';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { ResetPasswordDTO } from './dto/reset-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel('Admin') private readonly adminModel: Model<any>,
    @InjectModel('SuperAdmin') private readonly superAdminModel: Model<any>,
    @InjectModel('Otp') private readonly otpModel: Model<any>,
    private readonly jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  //-----------------------------------------
  // REGISTER
  //-----------------------------------------
  async register(dto: RegisterDTO) {
    const { email, password, username, role } = dto;

    // SECURITY FIX: Always check both collections to prevent duplicate emails
    const adminExists = await this.adminModel.findOne({ email });
    const superAdminExists = await this.superAdminModel.findOne({ email });

    if (adminExists || superAdminExists) {
      throw new BadRequestException('Email already exists');
    }

    const hashed = await bcrypt.hash(password, 10);

    if (role === 'SUPERADMIN') {
      const superAdmin = await this.superAdminModel.create({
        username,
        email,
        password: hashed,
        role: 'SUPERADMIN',
      });
      return {
        message: 'SuperAdmin registered successfully',
        user: superAdmin,
      };
    } else {
      if (!dto.area) {
        throw new BadRequestException('Area is required for ADMIN role');
      }
      const newUser = await this.adminModel.create({
        username,
        email,
        area: dto.area || 'Not Assigned',
        password: hashed,
        role: dto.role || 'ADMIN',
      });

      return { message: 'User registered successfully', user: newUser };
    }
  }

  //-----------------------------------------
  // LOGIN (Unchanged but validated via DTO)
  //-----------------------------------------
  async login(dto: LoginDTO) {
    const { email, password } = dto;

    const user =
      (await this.adminModel.findOne({ email })) ||
      (await this.superAdminModel.findOne({ email }));

    if (!user) throw new NotFoundException('Invalid credentials'); // Generic message

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user,
    };
  }

  //-----------------------------------------
  // FORGOT PASSWORD (OTP)
  //-----------------------------------------
  async forgotPassword(dto: ForgotPasswordDTO) {
    const { email } = dto;

    const user =
      (await this.adminModel.findOne({ email })) ||
      (await this.superAdminModel.findOne({ email }));

    if (!user) throw new NotFoundException('Email not found');

    // SECURITY FIX: Use crypto for secure random numbers
    const otp = crypto.randomInt(100000, 999999).toString();

    await this.otpModel.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min
    });

    await this.emailService.sendOtp(email, otp);

    return { message: 'OTP sent to your email' };
  }

  //-----------------------------------------
  // RESET PASSWORD
  //-----------------------------------------
  async resetPassword(dto: ResetPasswordDTO) {
    const { email, otp, password } = dto;

    const otpRecord = await this.otpModel.findOne({ email, otp });
    if (!otpRecord) throw new BadRequestException('Invalid OTP');

    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    const user =
      (await this.adminModel.findOne({ email })) ||
      (await this.superAdminModel.findOne({ email }));

    if (!user) throw new NotFoundException('User not found');

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    await this.otpModel.deleteMany({ email });

    return { message: 'Password updated successfully' };
  }
}
