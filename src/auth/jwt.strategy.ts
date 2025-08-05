import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { prisma } from '../lib/prisma';

export interface JwtPayload {
  sub: string;
  domain: string;
  prefix: string;
  iat: number;
  exp: number | null;
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
    const { sub: clientId } = payload;

    // ตรวจสอบใน database
    const tokenRecord = await prisma.token.findFirst({
      where: {
        clientId,
        isActive: true,
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Token not found or inactive');
    }

    return {
      clientId: payload.sub,
      domain: payload.domain,
      prefix: payload.prefix,
    };
  }
}