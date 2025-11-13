import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌', example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...' })
  refreshToken: string;
}

export class TokenResponseDto {
  @ApiProperty({ description: '访问令牌', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  token: string;

  @ApiProperty({ description: '刷新令牌', example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...' })
  refreshToken: string;
}