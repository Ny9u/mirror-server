import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const smtpConfig: SMTPTransport.Options = {
      host: this.configService.get<string>('SMTP_HOST', 'smtp.qq.com'),
      port: this.configService.get<number>('SMTP_PORT', 465),
      secure: this.configService.get<boolean>('SMTP_SECURE', true),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    };
    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  async sendVerificationCode(to: string, code: string, type: 'register' | 'reset' = 'register'): Promise<void> {
    let subject: string;
    let textContent: string;
    let htmlContent: string;
    
    switch (type) {
      case 'register':
        subject = 'Mirror - 注册账号';
        textContent = `欢迎注册Mirror！您的验证码是: ${code}，有效期为5分钟,如非本人操作，请忽略本邮件`;
        htmlContent = `<p>欢迎注册<strong>Mirror</strong>！您的验证码是: <strong>${code}</strong>，有效期为5分钟。</p>`;
        break;
      case 'reset':
        subject = 'Mirror - 重置密码';
        textContent = `您正在重置Mirror账号密码！您的验证码是: ${code}，有效期为5分钟,如非本人操作，请忽略本邮件`;
        htmlContent = `<p>您正在重置<strong>Mirror</strong>账号密码！您的验证码是: <strong>${code}</strong>，有效期为5分钟。</p>`;
        break;
      default:
        subject = 'Mirror - 验证码';
        textContent = `您的验证码是: ${code}，有效期为5分钟,如非本人操作，请忽略本邮件`;
        htmlContent = `<p>您的验证码是: <strong>${code}</strong>，有效期为5分钟。</p>`;
    }

    const mailOptions = {
      from: `"Mirror" <${this.configService.get<string>('SMTP_USER')}>`,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    };

    await this.transporter.sendMail(mailOptions);
  }
}