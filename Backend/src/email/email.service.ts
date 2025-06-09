import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { createTestAccount, getTestMessageUrl } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendVerificationEmail(to: string, token: string) {
 
    const testAccount = await createTestAccount();

    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      tls: {
        rejectUnauthorized: false, },
    });

    const verifyLink = `http://localhost:3000/auth/verify/${token}`;

    const info = await transporter.sendMail({
      from: '"Task Manager App" <noreply@taskapp.com>',
      to,
      subject: 'Verify Your Email',
      text: `Click here to verify your email: ${verifyLink}`,
      html: `<p>Hello,</p><p>Please click <a href="${verifyLink}">here</a> to verify your email.</p>`,
    });

    this.logger.log(`Verification email sent: ${getTestMessageUrl(info)}`);

    return {
      previewUrl: getTestMessageUrl(info), 
    };
  }
  async sendResetPasswordEmail(to: string, token: string) {
    const testAccount = await createTestAccount();
  
    const transporter = nodemailer.createTransport({
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
  
    const resetLink = `http://localhost:3000/auth/reset-password/${token}`;
  
    const info = await transporter.sendMail({
      from: '"Task Manager App" <noreply@taskapp.com>',
      to,
      subject: 'Reset Your Password',
      text: `Click here to reset your password: ${resetLink}`,
      html: `<p>Hello,</p><p>Please click <a href="${resetLink}">here</a> to reset your password .</p>`,
    });
  
    this.logger.log(`Password reset email sent: ${getTestMessageUrl(info)}`);
  
    return {
      previewUrl: getTestMessageUrl(info),
    };
  }
  
  async sendFileUploadConfirmation(to: string, filename: string, downloadLink: string) {
    const testAccount = await createTestAccount(); 
  
    const transporter = nodemailer.createTransport({
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
  
    this.logger.log(`File upload email sent: ${getTestMessageUrl(info)}`);
    return {
      previewUrl: getTestMessageUrl(info),
    };
  }
  
}
