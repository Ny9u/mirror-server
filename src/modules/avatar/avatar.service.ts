import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AvatarDto } from "./avatar.dto";
import { ImageProcessingService } from "./image-processing.service";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Express } from "express";

// 定义 Supabase 数据库类型
interface Database {
  public: {
    Tables: {
      Avatar: {
        Row: {
          id: number;
          avatarUrl: string;
        };
        Insert: {
          id: number;
          avatarUrl: string;
        };
        Update: {
          id?: number;
          avatarUrl?: string;
        };
      };
    };
  };
}

@Injectable()
export class AvatarService {
  private supabase: SupabaseClient<Database> | null;

  constructor(
    private prisma: PrismaService,
    private imageProcessingService: ImageProcessingService
  ) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      // 如果没有配置 Supabase，设置为 null 并在使用时检查
      this.supabase = null;
    }
  }

  /**
   * 获取用户头像信息
   * @param userId 用户ID
   * @returns 头像信息对象，包含头像ID和压缩后的头像URL，如果用户没有头像则返回null
   */
  async getAvatar(userId: number): Promise<AvatarDto | null> {
    const avatar = await this.prisma.avatar.findFirst({
      where: { id: userId },
    });
    const compressedAvatarUrl = avatar?.avatarUrl
      ? await this.imageProcessingService.compressImage(avatar.avatarUrl)
      : null;

    return avatar
      ? {
          id: avatar.id,
          avatarUrl: compressedAvatarUrl
            ? compressedAvatarUrl
            : avatar.avatarUrl,
        }
      : null;
  }

  /**
   * 获取用户头像URL
   * @param userId 用户ID
   * @returns 头像URL字符串，如果用户没有头像则返回null
   */
  async getAvatarUrl(userId: number): Promise<string | null> {
    const avatar = await this.getAvatar(userId);
    return avatar ? avatar.avatarUrl : null;
  }

  /**
   * 上传头像到Supabase Storage并更新数据库
   * @param userId 用户ID
   * @param file 文件对象
   * @returns 上传结果
   */
  async uploadAvatar(
    userId: number,
    file: Express.Multer.File
  ): Promise<{ avatarUrl: string }> {
    if (!this.supabase) {
      throw new Error("Supabase连接失败");
    }

    const fileName = `${userId}-${Date.now()}`;

    // 上传到Supabase Storage
    const { error } = await this.supabase.storage
      .from("mirror")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("上传失败:", error);
      throw new Error(`上传头像失败: ${error.message}`);
    }

    // 获取公共URL
    const {
      data: { publicUrl },
    } = this.supabase.storage.from("mirror").getPublicUrl(fileName);

    const avatar = await this.prisma.avatar.upsert({
      where: { id: userId },
      update: { avatarUrl: publicUrl },
      create: { id: userId, avatarUrl: publicUrl },
    });

    const compressedAvatarUrl = await this.imageProcessingService.compressImage(
      avatar.avatarUrl
    );
    return {
      avatarUrl: compressedAvatarUrl ? compressedAvatarUrl : avatar.avatarUrl,
    };
  }
}
