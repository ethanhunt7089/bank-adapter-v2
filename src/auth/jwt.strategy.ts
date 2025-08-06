import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { prisma } from '../lib/prisma';

export interface JwtPayload {
  sub: string;
  target_domain: string;
  iat: number;
  exp?: number; // optional เพราะเราไม่ใส่
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true, // ไม่มี expiration
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload) {
    const { sub: targetDomain } = payload;

    // ตรวจสอบใน database
    const tokenRecord = await prisma.token.findFirst({
      where: {
        targetDomain,
        isActive: true,
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Token not found or inactive');
    }

    return {
      target_domain: payload.sub,
    };
  }
}