import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import {
  AuthService,
  RevokeTokenDto,
  SetupDto,
  ValidateTokenDto,
} from "./auth.service";

@ApiExcludeController()
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("setup")
  @HttpCode(HttpStatus.OK)
  async setup(@Body() setupDto: SetupDto) {
    return this.authService.setup(setupDto);
  }

  @Post("validate")
  @HttpCode(HttpStatus.OK)
  async validateToken(@Body() validateTokenDto: ValidateTokenDto) {
    return this.authService.validateToken(validateTokenDto);
  }

  @Post("revoke")
  @HttpCode(HttpStatus.OK)
  async revokeToken(@Body() revokeTokenDto: RevokeTokenDto) {
    return this.authService.revokeToken(revokeTokenDto);
  }

  @Get("verify")
  @HttpCode(HttpStatus.OK)
  async verifyToken(
    @Headers("authorization") authorization?: string | string[]
  ) {
    try {
      // ดึง uuid จาก Authorization header: Bearer <uuid>
      let uuid: string | undefined = undefined;
      const authHeader = Array.isArray(authorization)
        ? authorization[0]
        : authorization;
      // Debug: แสดงค่า header (ตัดให้สั้นเพื่อความปลอดภัย)
      if (authHeader && typeof authHeader === "string") {
        const preview =
          authHeader.length > 48 ? `${authHeader.slice(0, 48)}...` : authHeader;
        //console.log('🔐 [verify] Authorization header preview:', preview);
      } else {
        //console.log('🔐 [verify] Authorization header is missing or not a string');
      }
      if (authHeader && typeof authHeader === "string") {
        const match = /^\s*Bearer\s+(.+)\s*$/i.exec(authHeader);
        if (match && match[1]) {
          let candidate = match[1].trim();
          // ตัด quote ถ้ามี
          if (
            (candidate.startsWith('"') && candidate.endsWith('"')) ||
            (candidate.startsWith("'") && candidate.endsWith("'"))
          ) {
            candidate = candidate.slice(1, -1);
          }
          //console.log('🧪 [verify] Parsed uuid from header (preview):', candidate.length > 16 ? `${candidate.slice(0, 16)}...` : candidate);
          uuid = candidate;
        }
      }

      //console.log('✅ [verify] Final uuid to use (header only):', uuid || 'undefined');
      if (!uuid)
        return { success: false, error: "Missing required parameter: uuid" };

      const { getTargetDomainByUuid } = await import("../lib/token-utils");
      const targetDomain = await getTargetDomainByUuid(uuid);

      if (!targetDomain) {
        // console.log('❌ [verify] Token not found or inactive for uuid:', uuid);
        return { success: false, error: "Token not found or inactive", uuid };
      }

      // console.log('🎯 [verify] targetDomain resolved:', targetDomain, 'for uuid:', uuid);
      return { success: true, uuid, targetDomain };
    } catch (error: any) {
      console.error("💥 [verify] Unexpected error:", error?.message ?? error);
      return {
        success: false,
        error: error?.message ?? "Internal server error",
      };
    }
  }
}
