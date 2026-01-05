import { ApiProperty } from "@nestjs/swagger";

export class AvatarDto {
  @ApiProperty({ description: "用户ID", example: 1 })
  id: number;

  @ApiProperty({
    description: "头像URL",
    example: "https://example.com/avatar.jpg",
  })
  avatarUrl: string;
}
