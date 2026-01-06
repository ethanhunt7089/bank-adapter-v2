import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { UserAuthGuard } from "./guards/user-auth.guard";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateTokenDto } from "./dto/update-token.dto";
import { UserProfileResponseDto } from "./dto/user-profile.dto";
import { TokenInfoResponseDto } from "./dto/token-info.dto";

@ApiExcludeController()
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.userService.register(registerDto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }

  @Get("profile")
  @UseGuards(UserAuthGuard)
  async getProfile(@Request() req: any) {
    return this.userService.getProfile(req.user.sub);
  }

  @Get("token")
  @UseGuards(UserAuthGuard)
  async getTokenInfo(@Request() req: any) {
    return this.userService.getTokenInfo(req.user.sub);
  }

  @Put("token")
  @UseGuards(UserAuthGuard)
  async updateToken(
    @Request() req: any,
    @Body() updateTokenDto: UpdateTokenDto
  ) {
    return this.userService.updateToken(req.user.sub, updateTokenDto);
  }
}
