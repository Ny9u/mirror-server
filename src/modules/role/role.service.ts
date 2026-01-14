import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRoleDto, UpdateRoleDto } from "./role.dto";

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取系统预设角色
   */
  async getSystemRoles() {
    return this.prisma.role.findMany({
      where: { isSystem: true },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * 获取用户自定义角色
   */
  async getUserRoles(userId: number) {
    return this.prisma.role.findMany({
      where: { userId: userId, isSystem: false },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 获取角色详情
   */
  async getRoleById(roleId: number, userId?: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException("角色不存在");
    }

    // 检查访问权限：系统角色所有人可访问，用户角色只有创建者可访问
    if (!role.isSystem && role.userId !== userId) {
      throw new ForbiddenException("无权访问该角色");
    }

    return role;
  }

  /**
   * 创建自定义角色
   */
  async createRole(userId: number, dto: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        avatar: dto.avatar,
        avatarColor: dto.avatarColor,
        prompt: dto.prompt,
        isSystem: false,
        userId: userId,
      },
    });
  }

  /**
   * 更新自定义角色
   */
  async updateRole(roleId: number, userId: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException("角色不存在");
    }

    if (role.isSystem) {
      throw new ForbiddenException("不能修改系统预设角色");
    }

    if (role.userId !== userId) {
      throw new ForbiddenException("无权修改该角色");
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: dto.name,
        description: dto.description,
        avatar: dto.avatar,
        avatarColor: dto.avatarColor,
        prompt: dto.prompt,
      },
    });
  }

  /**
   * 删除自定义角色
   */
  async deleteRole(roleId: number, userId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException("角色不存在");
    }

    if (role.isSystem) {
      throw new ForbiddenException("不能删除系统预设角色");
    }

    if (role.userId !== userId) {
      throw new ForbiddenException("无权删除该角色");
    }

    // 如果有用户正在使用这个角色，先清除他们的选择
    await this.prisma.userRole.deleteMany({
      where: { roleId: roleId },
    });

    await this.prisma.role.delete({
      where: { id: roleId },
    });

    return { message: "删除成功" };
  }

  /**
   * 选择角色
   */
  async selectRole(userId: number, roleId: number) {
    // 验证角色是否存在且可访问
    await this.getRoleById(roleId, userId);

    // 使用upsert实现选择或更新
    await this.prisma.userRole.upsert({
      where: { userId: userId },
      update: { roleId: roleId },
      create: { userId: userId, roleId: roleId },
    });

    return { message: "选择成功" };
  }

  /**
   * 获取用户当前选择的角色
   */
  async getSelectedRole(userId: number) {
    const userRole = await this.prisma.userRole.findUnique({
      where: { userId: userId },
    });

    if (!userRole) {
      return null;
    }

    const role = await this.prisma.role.findUnique({
      where: { id: userRole.roleId },
    });

    return role;
  }

  /**
   * 清除用户角色选择（恢复默认）
   */
  async clearSelectedRole(userId: number) {
    const userRole = await this.prisma.userRole.findUnique({
      where: { userId: userId },
    });

    if (userRole) {
      await this.prisma.userRole.update({
        where: { userId: userId },
        data: { roleId: 1 },
      });
    } else {
      await this.prisma.userRole.create({
        data: {
          userId: userId,
          roleId: 1,
        },
      });
    }

    return { message: "已恢复默认角色" };
  }

  /**
   * 获取用户当前的系统提示词
   */
  async getUserSystemPrompt(userId: number): Promise<string> {
    const selectedRole = await this.getSelectedRole(userId);

    if (selectedRole) {
      return selectedRole.prompt;
    }

    // 返回默认提示词
    return "你是一个专业、精准、高效的智能问答助手，名字叫Mirror。";
  }
}
