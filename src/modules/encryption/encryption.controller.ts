import { Controller, Get } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('encryption')
@Controller('encryption')
export class EncryptionController {
  constructor(private readonly encryptionService: EncryptionService) {}

  @Get('getPublicKey')
  @ApiOperation({ summary: '获取RSA公钥' })
  @ApiResponse({ status: 200, description: '成功获取公钥' })
  getPublicKey(): { publicKey: string } {
    return { publicKey: this.encryptionService.getPublicKey() };
  }
}