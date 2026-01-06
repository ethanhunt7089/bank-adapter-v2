import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../lib/prisma.service";

@Injectable()
export class UserAuthGuard extends AuthGuard("jwt") {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {
    super();
  }

  async canActivate(context: any): Promise<boolean> {
    // เรียกใช้ parent canActivate เพื่อตรวจสอบ JWT
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // ตรวจสอบว่า user ยัง active อยู่หรือไม่
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { isActive: true },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedException("User account is inactive");
    }

    return true;
  }
}
