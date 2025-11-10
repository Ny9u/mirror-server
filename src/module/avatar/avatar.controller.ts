import { Controller , Get , Query, ParseIntPipe } from "@nestjs/common";
import { AvatarService } from "./avatar.service";
import { AvatarDto } from "./avatar.dto";


@Controller('avatar')
export class AvatarController{
  constructor(private readonly avatarService: AvatarService) {}

  @Get()
  async getAvatar(@Query('userId', ParseIntPipe) userId: number): Promise<AvatarDto | null> {
    return this.avatarService.getAvatar(userId);
  }
}