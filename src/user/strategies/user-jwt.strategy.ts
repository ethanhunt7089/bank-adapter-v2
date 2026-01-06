import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../lib/prisma.service";

export interface UserJwtPayload {
  sub: number; // user id
  username: string;
  iat: number;
  exp: number;
}

@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: UserJwtPayload) {
    const { sub: userId } = payload;

    // ตรวจสอบว่า user ยังมีอยู่ใน database หรือไม่
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        isActive: true,
        token: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("User account is inactive");
    }

    return {
      sub: user.id,
      username: user.username,
      tokenUuid: user.token,
    };
  }
}
