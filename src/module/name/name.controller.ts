import { Controller, Get , Query, ParseIntPipe } from "@nestjs/common";
import { NameService } from "./name.service";

@Controller('name')
export class NameController {
  constructor(private readonly nameService: NameService) {}
  @Get()
  getName(@Query('id',ParseIntPipe) id: number) {
    return this.nameService.getName(id);
  }
}