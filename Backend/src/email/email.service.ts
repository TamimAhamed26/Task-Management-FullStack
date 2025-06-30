import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { getTestMessageUrl, createTestAccount } from 'nodemailer';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {}

  private readonly logger = new Logger(EmailService.name);
  private get ABSTRACT_API_KEY(): string | undefined {
  return this.configService.get<string>('ABSTRACT_API_KEY');
  }
  async isDeliverableEmail(email: string): Promise<boolean> {
    interface AbstractApiResponse {
      is_smtp_valid?: { value: boolean };
      [key: string]: any;
    }

    try {
      const res = await axios.get<AbstractApiResponse>(
        `https://emailvalidation.abstractapi.com/v1/?api_key=${this.ABSTRACT_API_KEY}&email=${encodeURIComponent(email)}`
      );
      return res.data?.is_smtp_valid?.value === true;
    } catch (err) {
      this.logger.warn(`Email verification failed for ${email}: ${err.message}`);
      return true;
    }
  }

  private async createTransporter(to: string) {
    const isReal = await this.isDeliverableEmail(to);

    if (isReal) {
      return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
   auth: {
       user: this.configService.get<string>('EMAIL_USER'),
       pass: this.configService.get<string>('EMAIL_PASS'),
         },
     tls:{
          rejectUnauthorized: false,
         },
      });
    } else {
      const testAccount = await createTestAccount();
      return nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }
  }

  async sendVerificationEmail(to: string, token: string) {
    const verifyLink = `http://localhost:3000/verify/${token}`;
    const transporter = await this.createTransporter(to);

    const info = await transporter.sendMail({
      from: '"Task Manager App" <noreply@taskapp.com>',
      to,
      subject: 'Verify Your Email',
      text: `Click here to verify your email: ${verifyLink}`,
      html: `<p>Hello,</p><p>Please click <a href="${verifyLink}">here</a> to verify your email.</p>`,
    });

    const previewUrl = getTestMessageUrl(info);
    this.logger.log(`Verification email sent to ${to}. Preview: ${previewUrl || 'N/A (real email)'}`);
    return { previewUrl };
  }

  async sendResetPasswordEmail(to: string, token: string) {
    const resetLink = `http://localhost:3000/reset-password/${token}`;
    const transporter = await this.createTransporter(to);

    const info = await transporter.sendMail({
      from: '"Task Manager App" <noreply@taskapp.com>',
      to,
      subject: 'Reset Your Password',
      text: `Click here to reset your password: ${resetLink}`,
      html: `<p>Hello,</p><p>Please click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });

    const previewUrl = getTestMessageUrl(info);
    this.logger.log(`Reset email sent to ${to}. Preview: ${previewUrl || 'N/A (real email)'}`);
    return { previewUrl };
  }

  async sendFileUploadConfirmation(to: string, filename: string, downloadLink: string) {
    const transporter = await this.createTransporter(to);

    const info = await transporter.sendMail({
      from: '"Task Manager App" <noreply@taskapp.com>',
      to,
      subject: 'File Upload Successful',
      html: `
        <p>Hello Admin,</p>
        <p>A new file <strong>${filename}</strong> has been uploaded successfully to the system.</p>
        <p><a href="${downloadLink}">Click here to download the report</a></p>
        <p>Thank you!</p>
      `,
    });

    const previewUrl = getTestMessageUrl(info);
    this.logger.log(`File upload email sent to ${to}. Preview: ${previewUrl || 'N/A (real email)'}`);
    return { previewUrl };
  }
}
