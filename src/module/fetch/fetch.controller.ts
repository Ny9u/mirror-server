import { Controller, Get } from "@nestjs/common";
import { FetchService } from "./fetch.service";

@Controller("fetch")
export class FetchController {
  constructor(private readonly fetchService: FetchService) {}
  @Get()
  getAll(params:{ id: number}){
    return this.fetchService.getAll(params)
  }
}