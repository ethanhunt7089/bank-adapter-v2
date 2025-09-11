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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBody,
} from "@nestjs/swagger";
import { UserService } from "./user.service";
import { UserAuthGuard } from "./guards/user-auth.guard";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateTokenDto } from "./dto/update-token.dto";
import { UserProfileResponseDto } from "./dto/user-profile.dto";
import { TokenInfoResponseDto } from "./dto/token-info.dto";

@ApiTags("User Authentication & Token Management")
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: "User registered successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "User registered successfully" },
        access_token: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: "Username already exists or Token UUID already in use",
  })
  @ApiResponse({
    status: 404,
    description: "Token UUID not found in bo_token table",
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.userService.register(registerDto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login user" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        access_token: {
          type: "string",
          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
        message: { type: "string", example: "Login successful" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials or inactive account",
  })
  async login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }

  @Get("profile")
  @UseGuards(UserAuthGuard)
  @ApiSecurity("Bearer")
  @ApiOperation({ summary: "Get user profile" })
  @ApiResponse({
    status: 200,
    description: "User profile retrieved successfully",
    type: UserProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT token",
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  async getProfile(@Request() req: any) {
    return this.userService.getProfile(req.user.sub);
  }

  @Get("token")
  @UseGuards(UserAuthGuard)
  @ApiSecurity("Bearer")
  @ApiOperation({ summary: "Get token information" })
  @ApiResponse({
    status: 200,
    description: "Token information retrieved successfully",
    type: TokenInfoResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT token",
  })
  @ApiResponse({
    status: 404,
    description: "User not found or no token associated",
  })
  async getTokenInfo(@Request() req: any) {
    return this.userService.getTokenInfo(req.user.sub);
  }

  @Put("token")
  @UseGuards(UserAuthGuard)
  @ApiSecurity("Bearer")
  @ApiOperation({ summary: "Update token settings" })
  @ApiBody({ type: UpdateTokenDto })
  @ApiResponse({
    status: 200,
    description: "Token updated successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Token updated successfully" },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing JWT token",
  })
  @ApiResponse({
    status: 404,
    description: "User not found or no token associated",
  })
  async updateToken(
    @Request() req: any,
    @Body() updateTokenDto: UpdateTokenDto
  ) {
    return this.userService.updateToken(req.user.sub, updateTokenDto);
  }
}
