import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { UserAuthGuard } from "./guards/user-auth.guard";
import { UserJwtStrategy } from "./strategies/user-jwt.strategy";
import { PrismaService } from "../lib/prisma.service";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "24h" }, // JWT token หมดอายุใน 24 ชั่วโมง
    }),
  ],
  controllers: [UserController],
  providers: [UserService, UserAuthGuard, UserJwtStrategy, PrismaService],
  exports: [UserService, UserAuthGuard],
})
export class UserModule {}
