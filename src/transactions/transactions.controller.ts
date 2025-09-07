import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiExcludeEndpoint,
} from "@nestjs/swagger";
import { Request } from "express";
import { TransactionsService } from "./transactions.service";
@ApiTags("BCEL-1 API")
@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get("transactions")
  @ApiSecurity("API Token")
  @ApiOperation({
    summary: "Get transactions list",
    description:
      "ดึงรายการธุรกรรม ผ่านพารามิเตอร์ accountNumber แบบคั่นจุลภาค เช่น 1641227858510,1641227858511.\n\n" +
      "> หมายเหตุ: สำหรับ JDB, LDB, LVB ต้องโอนด้วยการสแกน QR Code เท่านั้น (transfers must be made via QR Code scan only).",
    operationId: "transactions",
  })
  @ApiQuery({
    name: "accountNumber",
    required: true,
    description:
      "Comma-separated account numbers (filter toBankAccountNumber). fromDate จะถูกคำนวณอัตโนมัติ",
    example: "1641227858510",
  })
  @ApiResponse({
    status: 200,
    description: "Transactions retrieved successfully",
    content: {
      "application/json": {
        example: {
          success: true,
          data: [
            {
              id: "013d2454-e37b-40c5-9bd9-2ec7c5e76610",
              creditType: "DEPOSIT_AUTO",
              amount: "150000",
              currency: "LAK",
              status: "SUCCESS",
              fromName: "PHOUSIT SOUPHIDA MR",
              fromBankCode: "BCEL",
              fromBankAccountNumber: "010-12-00-xxxxx282-001",
              toName: "SAO KIEWLUIVANH MS",
              toBankCode: "BCEL",
              toBankAccountNumber: "1011229916222",
              remarks: "PHOUSIT SOUPHIDA MR - 010-12-00-xxxxx282-001",
              transactionTimestamp: "2024-08-13T22:43:19.000Z",
            },
          ],
          transactionTimestamp: "2024-08-13T22:43:19.000Z",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Missing required parameters",
    content: {
      "application/json": {
        example: {
          statusCode: 400,
          message: "Missing required parameter: accountNumber",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid token",
    content: {
      "application/json": {
        example: {
          statusCode: 401,
          message: "Missing or invalid authorization header",
        },
      },
    },
  })
  async getTransactions(
    @Req() request: Request,
    @Query("accountNumber") accountNumber: string
  ) {
    try {
      // ตรวจสอบ required parameters สำหรับ backend API
      if (!accountNumber?.trim()) {
        throw new HttpException(
          "Missing required parameter: accountNumber",
          HttpStatus.BAD_REQUEST
        );
      }

      // ดึง uuid จาก Authorization: Bearer <uuid>
      let uuid: string | undefined;
      const authorization = request.headers["authorization"] as
        | string
        | undefined;
      if (authorization === null || authorization === "") {
        throw new HttpException(
          "Missing Authorization header. Use: Bearer <API Token>",
          HttpStatus.UNAUTHORIZED
        );
      }
      const match = /^\s*Bearer\s+(.+)\s*$/i.exec(authorization ?? "");
      if (match && match[1]) {
        let candidate = match[1].trim();
        if (
          (candidate.startsWith('"') && candidate.endsWith('"')) ||
          (candidate.startsWith("'") && candidate.endsWith("'"))
        ) {
          candidate = candidate.slice(1, -1);
        }
        uuid = candidate;
      } else {
        // ถ้า user ใส่แค่ UUID ให้ใช้ UUID โดยตรง
        uuid = authorization.trim();
      }
      if (!uuid)
        throw new HttpException(
          "Missing required parameter: API Token",
          HttpStatus.BAD_REQUEST
        );

      // เรียก backend API ด้วย uuid
      const result = await this.transactionsService.processGetTransactions(
        {
          accountNumber,
        },
        uuid
      );

      return result;
    } catch (error) {
      console.error("Get transactions error:", error);
      throw new HttpException(
        error.message || "Internal server error",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("transaction-cursors/update-all")
  @ApiExcludeEndpoint()
  async updateAllTransactionCursors(
    @Req() request: Request,
    @Body() data: { lastSeenAt: string }
  ) {
    try {
      // ตรวจสอบ API Token
      let uuid: string | undefined;
      const authorization = request.headers["authorization"] as
        | string
        | undefined;

      if (authorization === null || authorization === "") {
        throw new HttpException(
          "Missing Authorization header. Use: Bearer <API Token>",
          HttpStatus.UNAUTHORIZED
        );
      }

      const match = /^\s*Bearer\s+(.+)\s*$/i.exec(authorization ?? "");
      if (match && match[1]) {
        let candidate = match[1].trim();
        if (
          (candidate.startsWith('"') && candidate.endsWith('"')) ||
          (candidate.startsWith("'") && candidate.endsWith("'"))
        ) {
          candidate = candidate.slice(1, -1);
        }
        uuid = candidate;
      } else {
        uuid = authorization.trim();
      }

      if (!uuid)
        throw new HttpException(
          "Missing required parameter: API Token",
          HttpStatus.BAD_REQUEST
        );

      // เรียก service
      const result = await this.transactionsService.updateAllTransactionCursors(
        data.lastSeenAt,
        uuid
      );

      return result;
    } catch (error) {
      console.error("Update transaction cursors error:", error);
      throw new HttpException(
        error.message || "Internal server error",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
