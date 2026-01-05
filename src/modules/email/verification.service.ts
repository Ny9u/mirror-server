import { Injectable } from "@nestjs/common";
import { EmailService } from "./email.service";

@Injectable()
export class VerificationService {
  private verificationCodes = new Map<
    string,
    { code: string; expiresAt: Date }
  >();

  constructor(private emailService: EmailService) {}

  /**
   * 生成验证码
   * @param email 邮箱地址
   * @returns 生成的验证码
   */
  generateVerificationCode(email: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // 设置5分钟后过期
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.verificationCodes.set(email, { code, expiresAt });
    return code;
  }

  /**
   * 验证验证码
   * @param email 邮箱地址
   * @param code 验证码
   * @returns 验证是否成功
   */
  verifyCode(email: string, code: string): boolean {
    const stored = this.verificationCodes.get(email);

    if (!stored || stored.code !== code) {
      return false;
    }

    if (new Date() > stored.expiresAt) {
      this.verificationCodes.delete(email);
      return false;
    }

    this.verificationCodes.delete(email);
    return true;
  }

  /**
   * 发送验证码
   * @param email 邮箱地址
   * @param type 验证码类型，用于区分不同场景（register: 注册, reset: 重置密码）
   */
  async sendVerificationCode(
    email: string,
    type: "register" | "reset" = "register"
  ): Promise<void> {
    const code = this.generateVerificationCode(email);
    await this.emailService.sendVerificationCode(email, code, type);
  }
}
