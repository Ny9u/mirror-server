import { Controller, Get , Query, ParseIntPipe } from "@nestjs/common";
import { NameService } from "./name.service";
import { NameDto } from "./name.dto";

@Controller('name')
export class NameController {
  constructor(private readonly nameService: NameService) {}
  @Get()
  async getName(@Query('userId',ParseIntPipe) userId: number): Promise<NameDto | null> {
    return this.nameService.getName(userId);
  }
}