import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Req,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiSecurity,
} from "@nestjs/swagger";
import { BankAccountService } from "./bank-account.service";
import { Request } from "express";

@ApiTags("Banking")
@Controller()
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Get("bank-account")
  @ApiSecurity("API Token")
  @ApiOperation({
    summary: "Get bank accounts list",
    description:
      "ดึงรายการบัญชีธนาคาร BCEL1 ที่พร้อมใช้งานสำหรับฝาก (Get available BCEL1 bank accounts for deposit operations)",
    operationId: "bank-account",
  })
  @ApiResponse({
    status: 200,
    description: "Bank accounts retrieved successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid token",
  })
  @ApiResponse({
    status: 500,
    description: "Internal server error",
  })
  async getBankAccounts(@Req() request: Request) {
    // ดึง uuid จาก Authorization: Bearer <uuid> หรือส่ง UUID ตรงๆ
    const authHeader = (request.headers["authorization"] ?? "") as string;

    let uuid: string | undefined;
    const match = /^\s*Bearer\s+(.+)\s*$/i.exec(authHeader);
    if (match?.[1]) {
      let candidate = match[1].trim();
      if (
        (candidate.startsWith('"') && candidate.endsWith('"')) ||
        (candidate.startsWith("'") && candidate.endsWith("'"))
      ) {
        candidate = candidate.slice(1, -1);
      }
      uuid = candidate;
    } else if (authHeader) {
      uuid = authHeader.trim();
    }

    if (!uuid) {
      throw new HttpException(
        "Missing or invalid authorization header",
        HttpStatus.UNAUTHORIZED
      );
    }

    try {
      const result = await this.bankAccountService.getBankAccounts(uuid);
      return result;
    } catch (error: any) {
      throw new HttpException(
        error.message || "Failed to fetch bank accounts",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
