import { Controller , Get , Query, ParseIntPipe } from "@nestjs/common";
import { AvatarService } from "./avatar.service"


@Controller('avatar')
export class AvatarController{
  constructor(private readonly avatarService: AvatarService) {}

  @Get()
  getAvatar(@Query('id',ParseIntPipe) id: number) {
    return this.avatarService.getAvatar(id)
  }
}