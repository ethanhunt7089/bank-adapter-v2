import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
    AuthService,
    CreateClientDto,
    CreateTokenDto,
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

  @Post('client')
  @HttpCode(HttpStatus.CREATED)
  async createClient(@Body() createClientDto: CreateClientDto) {
    return this.authService.createClient(createClientDto);
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  async createToken(@Body() createTokenDto: CreateTokenDto) {
    return this.authService.createToken(createTokenDto);
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
}