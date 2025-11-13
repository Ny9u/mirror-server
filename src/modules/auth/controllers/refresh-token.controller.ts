import { Controller, Post, Body, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { RefreshTokenService } from '../services/refresh-token.service';
import { UserService } from '../../user/user.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RefreshTokenDto, TokenResponseDto } from '../dtos/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class RefreshTokenController {
  constructor(
    private readonly refreshTokenService: RefreshTokenService,
    private readonly userService: UserService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiResponse({ status: 200, description: '成功刷新访问令牌' })
  @ApiResponse({ status: 401, description: '无效的refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokenResponseDto> {
    try {
      const { token, newRefreshToken } = await this.refreshTokenService.refreshAccessToken(refreshTokenDto.refreshToken);
      return {
        token,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      // 如果是特定的错误类型，保持原有错误信息
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('无效的refresh token');
    }
  }
}