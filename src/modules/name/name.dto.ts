import { ApiProperty } from '@nestjs/swagger';

export class NameDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: 'john_doe' })
  userName: string;
}