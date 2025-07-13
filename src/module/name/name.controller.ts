import { Controller, Get , Query, ParseIntPipe } from "@nestjs/common";
import { NameService } from "./name.service";

@Controller('name')
export class NameController {
  constructor(private readonly nameService: NameService) {}
  @Get()
  getName(@Query('userId',ParseIntPipe) userId: number) {
    return this.nameService.getName(userId);
  }
}