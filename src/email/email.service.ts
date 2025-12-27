import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_Pass,
      },
    });

    // debug (temporary)
    console.log(
      'SMTP:',
      process.env.SMTP_EMAIL,
      process.env.SMTP_Pass ? 'PASS_OK' : 'PASS_MISSING',
    );
  }

  async sendOtp(to: string, otp: string) {
    return this.transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to,
      subject: 'OTP Verification',
      text: `Your OTP is ${otp}`,
    });
  }

  async sendPasswordResetEmail(to: string, link: string) {
    return this.transporter.sendMail({
      from: process.env.SMTP_EMAIL,
      to,
      subject: 'Reset Your Password',
      html: `
        <p>Click the link below to reset your password:</p>
        <a href="${link}">${link}</a>
        <p>This link expires in 10 minutes.</p>
      `,
    });
  }
}
