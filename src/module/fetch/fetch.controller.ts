import { Controller, Get, Query } from "@nestjs/common";
import { FetchService } from "./fetch.service";

@Controller("fetch")
export class FetchController {
  constructor(private readonly fetchService: FetchService) {}
  @Get()
  getUserInfo(@Query() params: { userId: number }) {
    return this.fetchService.getUserInfo(params);
  }
}