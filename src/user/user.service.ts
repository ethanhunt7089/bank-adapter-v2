import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../lib/prisma.service";
import * as bcrypt from "bcrypt";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { UpdateTokenDto } from "./dto/update-token.dto";
import { UserProfileDto, UserProfileResponseDto } from "./dto/user-profile.dto";
import { TokenInfoDto, TokenInfoResponseDto } from "./dto/token-info.dto";

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async register(
    registerDto: RegisterDto
  ): Promise<{ success: boolean; message: string; access_token?: string }> {
    const { username, password, tokenUuid: token } = registerDto;

    // ตรวจสอบว่า username มีอยู่แล้วหรือไม่
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException("Username already exists");
    }

    // ตรวจสอบว่า token มีอยู่ใน bo_token หรือไม่
    const boToken = await this.prisma.boToken.findUnique({
      where: { token },
    });

    if (!boToken) {
      throw new NotFoundException("Token not found in bo_token table");
    }

    // ตรวจสอบว่า token นี้ถูกใช้แล้วหรือไม่
    const existingUserWithToken = await this.prisma.user.findFirst({
      where: { token },
    });

    if (existingUserWithToken) {
      throw new ConflictException(
        "Token is already associated with another user"
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // สร้าง user ใหม่
    const user = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        token,
      },
    });

    // สร้าง JWT token
    const payload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      message: "User registered successfully",
      access_token: accessToken,
    };
  }

  async login(
    loginDto: LoginDto
  ): Promise<{ success: boolean; access_token: string; message: string }> {
    const { username, password } = loginDto;

    // หา user
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // ตรวจสอบ password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // ตรวจสอบว่า user active หรือไม่
    if (!user.isActive) {
      throw new UnauthorizedException("User account is inactive");
    }

    // สร้าง JWT token
    const payload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    return {
      success: true,
      access_token: accessToken,
      message: "Login successful",
    };
  }

  async getProfile(userId: number): Promise<UserProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        isActive: true,
        token: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        isActive: user.isActive,
        tokenUuid: user.token,
        createdAt: user.createdAt,
      },
    };
  }

  async getTokenInfo(userId: number): Promise<TokenInfoResponseDto> {
    // หา user และ bo_token ที่เกี่ยวข้อง
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        boToken: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.boToken) {
      throw new NotFoundException("No token associated with this user");
    }

    return {
      success: true,
      data: {
        token: user.boToken.token,
        targetDomain: user.boToken.targetDomain,
        paymentSys: user.boToken.paymentSys,
        deposit: user.boToken.deposit,
        withdraw: user.boToken.withdraw,
        isActive: user.boToken.isActive,
      },
    };
  }

  async updateToken(
    userId: number,
    updateTokenDto: UpdateTokenDto
  ): Promise<{ success: boolean; message: string }> {
    // หา user และ bo_token ที่เกี่ยวข้อง
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        boToken: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.boToken) {
      throw new NotFoundException("No token associated with this user");
    }

    // อัพเดต bo_token
    await this.prisma.boToken.update({
      where: { token: user.boToken.token },
      data: {
        ...(updateTokenDto.paymentSys && {
          paymentSys: updateTokenDto.paymentSys,
        }),
        ...(updateTokenDto.deposit !== undefined && {
          deposit: updateTokenDto.deposit,
        }),
        ...(updateTokenDto.withdraw !== undefined && {
          withdraw: updateTokenDto.withdraw,
        }),
      },
    });

    return {
      success: true,
      message: "Token updated successfully",
    };
  }

  async validateUser(userId: number): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        isActive: true,
        token: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }
}
