import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { RoleService } from "./role.service";
import {
  CreateRoleDto,
  UpdateRoleDto,
  SelectRoleDto,
  DeleteRoleDto,
  ClearRoleDto,
  RoleResponseDto,
} from "./role.dto";

@ApiTags("role")
@Controller("role")
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get("system")
  @ApiOperation({ summary: "获取系统预设角色列表" })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: [RoleResponseDto],
  })
  async getSystemRoles() {
    return this.roleService.getSystemRoles();
  }

  @Get("user")
  @ApiOperation({ summary: "获取用户自定义角色列表" })
  @ApiQuery({ name: "userId", description: "用户ID", type: Number })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: [RoleResponseDto],
  })
  async getUserRoles(@Query("userId", ParseIntPipe) userId: number) {
    return this.roleService.getUserRoles(userId);
  }

  @Get("selected")
  @ApiOperation({ summary: "获取用户当前选择的角色" })
  @ApiQuery({ name: "userId", description: "用户ID", type: Number })
  @ApiResponse({ status: 200, description: "获取成功", type: RoleResponseDto })
  async getSelectedRole(@Query("userId", ParseIntPipe) userId: number) {
    return this.roleService.getSelectedRole(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取角色详情" })
  @ApiQuery({ name: "userId", description: "用户ID", type: Number })
  @ApiResponse({ status: 200, description: "获取成功", type: RoleResponseDto })
  @ApiResponse({ status: 404, description: "角色不存在" })
  async getRoleById(
    @Param("id", ParseIntPipe) id: number,
    @Query("userId", ParseIntPipe) userId: number
  ) {
    return this.roleService.getRoleById(id, userId);
  }

  @Post("create")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "创建自定义角色" })
  @ApiResponse({ status: 200, description: "创建成功", type: RoleResponseDto })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.roleService.createRole(dto.userId, dto);
  }

  @Post("update")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "更新自定义角色" })
  @ApiResponse({ status: 200, description: "更新成功", type: RoleResponseDto })
  @ApiResponse({ status: 403, description: "无权修改该角色" })
  @ApiResponse({ status: 404, description: "角色不存在" })
  async updateRole(@Body() dto: UpdateRoleDto) {
    return this.roleService.updateRole(dto.id, dto.userId, dto);
  }

  @Post("delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "删除自定义角色" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 403, description: "无权删除该角色" })
  @ApiResponse({ status: 404, description: "角色不存在" })
  async deleteRole(@Body() dto: DeleteRoleDto) {
    return this.roleService.deleteRole(dto.id, dto.userId);
  }

  @Post("select")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "选择使用的角色" })
  @ApiResponse({ status: 200, description: "选择成功" })
  @ApiResponse({ status: 404, description: "角色不存在" })
  async selectRole(@Body() dto: SelectRoleDto) {
    return this.roleService.selectRole(dto.userId, dto.roleId);
  }

  @Post("clear")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "清除角色选择（恢复默认）" })
  @ApiResponse({ status: 200, description: "已恢复默认角色" })
  async clearSelectedRole(@Body() dto: ClearRoleDto) {
    return this.roleService.clearSelectedRole(dto.userId);
  }
}
