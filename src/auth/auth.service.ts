import {
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { prisma } from '../lib/prisma';



export interface SetupDto {
  target_domain: string;
}



export interface ValidateTokenDto {
  token: string;
}

export interface RevokeTokenDto {
  token: string;
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}



  async setup(setupDto: SetupDto) {
    const { target_domain } = setupDto;

    // หาหรือสร้าง client สำหรับ domain นี้
    let client = await prisma.token.findFirst({
      where: { targetDomain: target_domain },
    });

    if (client) {
      // อัปเดตให้ active
      client = await prisma.token.update({
        where: { id: client.id },
        data: { isActive: true },
      });
    } else {
      // สร้าง client ใหม่
      client = await prisma.token.create({
        data: {
          targetDomain: target_domain,
          isActive: true,
        },
      });
    }

    // สร้าง token ทันที
    const payload = {
      sub: client.targetDomain, // ใช้ targetDomain เป็น subject
      target_domain: client.targetDomain,
      iat: Math.floor(Date.now() / 1000),
      // ไม่ใส่ exp = ไม่มี expiration
    };

    const token = this.jwtService.sign(payload);

    // อัปเดต token_hash
    await prisma.token.update({
      where: { id: client.id },
      data: { tokenHash: token },
    });

    return {
      success: true,
      access_token: token,
      token_type: 'Bearer',
    };
  }





  async validateToken(validateTokenDto: ValidateTokenDto) {
    const { token } = validateTokenDto;

    try {
      // ตรวจสอบ JWT token
      const payload = this.jwtService.verify(token);

      // ตรวจสอบใน database โดยใช้ token_hash
      const tokenRecord = await prisma.token.findFirst({
        where: {
          tokenHash: token,
          isActive: true,
        },
      });

      if (!tokenRecord) {
        throw new UnauthorizedException('Token not found or inactive');
      }

      return {
        valid: true,
        target_domain: payload.sub,
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Invalid token',
      };
    }
  }

  async revokeToken(revokeTokenDto: RevokeTokenDto) {
    const { token } = revokeTokenDto;

    try {
      // ตรวจสอบ JWT token
      const payload = this.jwtService.verify(token);

      // อัปเดต token เป็น inactive
      await prisma.token.update({
        where: {
          targetDomain: payload.sub,
          tokenHash: token,
        },
        data: {
          isActive: false,
        },
      });

      return {
        success: true,
        message: 'Token revoked successfully',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}