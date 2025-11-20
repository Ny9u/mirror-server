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

  async sendVerificationCode(to: string, code: string): Promise<void> {
    const mailOptions = {
      from: `"Mirror" <${this.configService.get<string>('SMTP_USER')}>`,
      to,
      subject: '官网登录验证',
      text: `您的验证码是: ${code}，有效期为5分钟,如非本人操作，请忽略本邮件`,
      html: `<p>您的验证码是: <strong>${code}</strong>，有效期为5分钟。</p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }
}