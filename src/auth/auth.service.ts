import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { prisma } from '../lib/prisma';

export interface CreateClientDto {
  client_id: string;
  client_secret: string;
  description?: string;
  target_domain: string;
}

export interface SetupDto {
  target_domain: string;
  prefix: string;
}

export interface CreateTokenDto {
  client_id: string;
  client_secret: string;
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

  private generateClientId(): string {
    return `client-${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateClientSecret(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  async setup(setupDto: SetupDto) {
    const { target_domain, prefix } = setupDto;

    // ตรวจสอบว่ามี target_domain + prefix นี้อยู่แล้วหรือไม่
    const existingClient = await prisma.token.findFirst({
      where: {
        targetDomain: target_domain,
        prefix: prefix,
      },
    });

    if (existingClient) {
      // อัปเดต client_secret และ token ใหม่
      const client_secret = this.generateClientSecret();

      const client = await prisma.token.update({
        where: { id: existingClient.id },
        data: {
          clientSecret: client_secret,
          isActive: true,
        },
      });

      // สร้าง JWT payload
      const payload = {
        sub: client.clientId,
        domain: target_domain,
        prefix: prefix,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = this.jwtService.sign(payload);

      // อัปเดต token_hash
      await prisma.token.update({
        where: { id: existingClient.id },
        data: { tokenHash: token },
      });

      return {
        access_token: token,
        token_type: 'Bearer',
      };
    } else {
      // สร้างใหม่
      const client_id = this.generateClientId();
      const client_secret = this.generateClientSecret();

      const client = await prisma.token.create({
        data: {
          clientId: client_id,
          clientSecret: client_secret,
          description: 'Auto-generated client',
          targetDomain: target_domain,
          prefix: prefix,
          isActive: true,
        },
      });

      // สร้าง JWT payload
      const payload = {
        sub: client.clientId,
        domain: target_domain,
        prefix: prefix,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = this.jwtService.sign(payload);

      // อัปเดต token_hash
      await prisma.token.update({
        where: { clientId: client_id },
        data: { tokenHash: token },
      });

      return {
        access_token: token,
        token_type: 'Bearer',
      };
    }
  }

  async createClient(createClientDto: CreateClientDto) {
    const { client_id, client_secret, description, target_domain } =
      createClientDto;

    // ตรวจสอบว่า client_id ซ้ำหรือไม่
    const existingClient = await prisma.token.findUnique({
      where: { clientId: client_id },
    });

    if (existingClient) {
      throw new ConflictException('Client ID already exists');
    }

    // สร้าง client ใหม่
    const client = await prisma.token.create({
      data: {
        clientId: client_id,
        clientSecret: client_secret,
        description: description || null,
        targetDomain: target_domain,
        isActive: true,
      },
    });

    return {
      success: true,
      message: 'Client created successfully',
      client: {
        client_id: client.clientId,
        description: client.description,
        target_domain: client.targetDomain,
        is_active: client.isActive,
      },
    };
  }

  async createToken(createTokenDto: CreateTokenDto) {
    const { client_id, client_secret } = createTokenDto;

    // ตรวจสอบ credentials ใน database
    const client = await prisma.token.findFirst({
      where: {
        clientId: client_id,
        clientSecret: client_secret,
        isActive: true,
        tokenHash: null, // ยังไม่มี token
      },
    });

    if (!client) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // สร้าง JWT payload
    const payload = {
      sub: client.clientId,
      target_domain: client.targetDomain,
      iat: Math.floor(Date.now() / 1000),
      exp: null, // ไม่มี expiration
    };

    // สร้าง JWT token
    const token = this.jwtService.sign(payload);

    // อัปเดต token_hash ใน database
    await prisma.token.update({
      where: { clientId: client_id },
      data: { tokenHash: token },
    });

    return {
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
        client_id: payload.sub,
        target_domain: payload.domain,
        prefix: payload.prefix, // เพิ่ม prefix
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
          clientId: payload.sub,
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