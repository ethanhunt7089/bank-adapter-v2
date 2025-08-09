import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  AuthService,
  RevokeTokenDto,
  SetupDto,
  ValidateTokenDto,
} from './auth.service';

@ApiExcludeController()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  async setup(@Body() setupDto: SetupDto) {
    return this.authService.setup(setupDto);
  }





  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Body() validateTokenDto: ValidateTokenDto) {
    return this.authService.validateToken(validateTokenDto);
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  async revokeToken(@Body() revokeTokenDto: RevokeTokenDto) {
    return this.authService.revokeToken(revokeTokenDto);
  }

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  async verifyToken(@Query('uuid') uuid?: string) {
    try {
      if (!uuid) {
        return { success: false, error: 'Missing required parameter: uuid' };
      }

      const { getTargetDomainByUuid } = await import('../lib/token-utils');
      const targetDomain = await getTargetDomainByUuid(uuid);

      if (!targetDomain) {
        return { success: false, error: 'Token not found or inactive', uuid };
      }

      return { success: true, uuid, targetDomain };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Internal server error' };
    }
  }
}