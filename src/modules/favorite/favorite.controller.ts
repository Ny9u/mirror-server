import { 
  Controller, 
  Post, 
  Body, 
  Query,
  Get,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FavoriteService } from './favorite.service';
import { 
  CreateFavoriteDto,
  RemoveFavoriteDto,
  GetFavoritesDto,
  GetFavoriteDetailDto
} from './favorite.dto';

@ApiTags('Favorite')
@Controller('favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post()
  @ApiOperation({ summary: '用户收藏' })
  @ApiResponse({ status: 201, description: '收藏成功' })
  @ApiResponse({ status: 400, description: '请求参数错误或已收藏' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async addFavorite(@Body() createFavoriteDto: CreateFavoriteDto) {
    return this.favoriteService.addFavorite(createFavoriteDto);
  }

  @Post('removeFavorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除收藏' })
  @ApiResponse({ status: 200, description: '取消收藏成功' })
  @ApiResponse({ status: 404, description: '收藏关系不存在' })
  async removeFavorite(@Body() removeFavoriteDto: RemoveFavoriteDto) {
    return this.favoriteService.removeFavorite(removeFavoriteDto);
  }

  @Get('getUserFavorites')
  @ApiOperation({ summary: '获取收藏列表' })
  @ApiQuery({ name: 'userId', required: true, description: '用户ID', example: 1 })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: '每页数量', example: 20 })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'tag', required: false, description: '标签过滤' })
  @ApiResponse({ status: 200, description: '获取收藏列表成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserFavorites(@Query() query: GetFavoritesDto) {
    return this.favoriteService.getUserFavorites(query);
  }

  @Post('getFavoriteDetail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '查询单个收藏' })
  @ApiResponse({ status: 200, description: '获取收藏内容成功' })
  @ApiResponse({ status: 404, description: '收藏内容不存在' })
  async getFavoriteDetail(@Body() query: GetFavoriteDetailDto) {
    return this.favoriteService.getFavoriteDetail(query);
  }
}