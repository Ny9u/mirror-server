import { Controller, Post, UseGuards, Request, HttpStatus, HttpCode, Req } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { UserDto } from "../../user/user.dto";
import { AvatarService } from "../../avatar/avatar.service";

type User = UserDto;

interface AuthRequest {
  user: User;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly avatarService: AvatarService) {}
  // 验证JWT令牌并返回用户信息
  @UseGuards(AuthGuard('jwt'))
  @Post("validate")
  @HttpCode(HttpStatus.OK)
  async validateToken(@Req() req: AuthRequest): Promise<UserDto> {
    const user = req.user;
    const userAvatar = await this.avatarService.getAvatar(user.id);
    const avatarUrl = userAvatar ? userAvatar.avatarUrl : null;
    
    return {
      ...user,
      avatar: avatarUrl
    };
  }
}