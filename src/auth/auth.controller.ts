import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request } from '@nestjs/common';
import {
  AuthService,
  RevokeTokenDto,
  SetupDto,
  ValidateTokenDto,
} from './auth.service';

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
  async verifyToken(@Request() req: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Missing or invalid Authorization header' };
    }

    const token = authHeader.substring(7);
    return this.authService.validateToken({ token });
  }
}