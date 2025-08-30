import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiBody,
  ApiSecurity,
} from "@nestjs/swagger";
import { PaymentService } from "../services/payment.service";
import { CreateDepositDto } from "../dto/create-deposit.dto";
import { CreateWithdrawDto } from "../dto/create-withdraw.dto";
import {
  CreateDepositPayload,
  CreateWithdrawPayload,
} from "../interfaces/payment-gateway.interface";

@ApiTags("Payment Gateway")
@Controller()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post("create-deposit")
  @ApiSecurity("API Token")
  @ApiOperation({
    summary: "Create deposit transaction",
    description:
      "สร้างธุรกรรมฝากเงินผ่าน Payment Gateway (BIB-Pay, Easy-Pay) โดยใช้ API Token จาก Authorization header",
  })
  @ApiBody({
    type: CreateDepositDto,
    description: "ข้อมูลสำหรับสร้างธุรกรรมฝากเงิน",
  })
  @ApiResponse({
    status: 200,
    description: "Deposit created successfully",
    content: {
      "application/json": {
        example: {
          success: true,
          message: "Deposit created successfully",
          qrcodeUrl: "https://example.com/qr-code.png",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid parameters or token",
    content: {
      "application/json": {
        example: {
          statusCode: 400,
          message: "Missing required parameter: API Token",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or inactive token",
    content: {
      "application/json": {
        example: {
          statusCode: 401,
          message: "Invalid token: token not found",
        },
      },
    },
  })
  async createDeposit(
    @Body() payload: CreateDepositPayload,
    @Req() request: Request
  ) {
    try {
      this.logger.log(`Creating deposit with ref: ${payload.refCode}`);

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

      const result = await this.paymentService.createDeposit(payload, uuid);

      if (result.success) {
        return {
          success: true,
          message: result.message,
          qrcodeUrl: result.qrcodeUrl,
        };
      } else {
        throw new HttpException(
          result.message || "Failed to create deposit",
          HttpStatus.BAD_REQUEST
        );
      }
    } catch (error) {
      this.logger.error(`Error creating deposit: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post("create-withdraw")
  @ApiSecurity("API Token")
  @ApiOperation({
    summary: "Create withdraw transaction",
    description:
      "สร้างธุรกรรมถอนเงินผ่าน Payment Gateway (BIB-Pay, Easy-Pay) โดยใช้ API Token จาก Authorization header",
  })
  @ApiBody({
    type: CreateWithdrawDto,
    description: "ข้อมูลสำหรับสร้างธุรกรรมถอนเงิน",
  })
  @ApiResponse({
    status: 200,
    description: "Withdraw created successfully",
    content: {
      "application/json": {
        example: {
          success: true,
          message: "",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid parameters or token",
    content: {
      "application/json": {
        example: {
          statusCode: 400,
          message: "Missing required parameter: API Token",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or inactive token",
    content: {
      "application/json": {
        example: {
          statusCode: 401,
          message: "Invalid token: token not found",
        },
      },
    },
  })
  async createWithdraw(
    @Body() payload: CreateWithdrawPayload,
    @Req() request: Request
  ) {
    try {
      this.logger.log(`Creating withdraw with ref: ${payload.refCode}`);

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

      const result = await this.paymentService.createWithdraw(payload, uuid);

      if (result.success) {
        return {
          success: true,
          message: "",
        };
      } else {
        throw new HttpException(
          result.message || "Failed to create withdraw",
          HttpStatus.BAD_REQUEST
        );
      }
    } catch (error) {
      this.logger.error(`Error creating withdraw: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("deposit-status/:refCode")
  @ApiSecurity("API Token")
  @ApiOperation({
    summary: "Get deposit status",
    description: "ดูสถานะธุรกรรมฝากเงินตามรหัสอ้างอิง",
  })
  @ApiResponse({
    status: 200,
    description: "Deposit status retrieved successfully",
    content: {
      "application/json": {
        example: {
          success: true,
          data: {
            refCode: "DEP001",
            amount: 100000,
            depositAmount: 100000,
            accountName: "John Doe",
            bankNumber: "1234567890",
            bankCode: "BCEL",
            gatewayType: "bibpay",
            status: "pending",
            qrcode:
              "00020101021229370016A000000677010111021308355660444105802TH530376454041.376304A3D8",
            createdAt: "2024-01-15T10:30:00.000Z",
            updatedAt: "2024-01-15T10:30:00.000Z",
            completedAt: null,
          },
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
  @ApiResponse({
    status: 404,
    description: "Deposit not found",
    content: {
      "application/json": {
        example: {
          statusCode: 404,
          message: "Deposit not found",
        },
      },
    },
  })
  async getDepositStatus(
    @Param("refCode") refCode: string,
    @Req() request: Request
  ) {
    try {
      this.logger.log(`Getting deposit status for ref: ${refCode}`);

      const deposit = await this.paymentService.getDepositStatus(refCode);

      if (!deposit) {
        throw new HttpException("Deposit not found", HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: {
          refCode: deposit.ref_code,
          amount: deposit.amount,
          depositAmount: deposit.deposit_amount,
          accountName: deposit.account_name,
          bankNumber: deposit.bank_number,
          bankCode: deposit.bank_code,
          gatewayType: deposit.gateway_type,
          status: deposit.status,
          qrcode: deposit.qr_code,
          createdAt: deposit.created_at,
          updatedAt: deposit.updated_at,
          completedAt: deposit.completed_at,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting deposit status: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("withdraw-status/:refCode")
  @ApiSecurity("API Token")
  @ApiOperation({
    summary: "Get withdraw status",
    description: "ดูสถานะธุรกรรมถอนเงินตามรหัสอ้างอิง",
  })
  @ApiResponse({
    status: 200,
    description: "Withdraw status retrieved successfully",
    content: {
      "application/json": {
        example: {
          success: true,
          data: {
            refCode: "WIT001",
            amount: 50000,
            accountName: "Jane Doe",
            bankNumber: "0987654321",
            bankCode: "BCEL",
            gatewayType: "bibpay",
            status: "pending",
            createdAt: "2024-01-15T10:30:00.000Z",
            updatedAt: "2024-01-15T10:30:00.000Z",
            completedAt: null,
          },
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
  @ApiResponse({
    status: 404,
    description: "Withdraw not found",
    content: {
      "application/json": {
        example: {
          statusCode: 404,
          message: "Withdraw not found",
        },
      },
    },
  })
  async getWithdrawStatus(
    @Param("refCode") refCode: string,
    @Req() request: Request
  ) {
    try {
      this.logger.log(`Getting withdraw status for ref: ${refCode}`);

      const withdraw = await this.paymentService.getWithdrawStatus(refCode);

      if (!withdraw) {
        throw new HttpException("Withdraw not found", HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        data: {
          refCode: withdraw.ref_code,
          amount: withdraw.amount,
          accountName: withdraw.account_name,
          bankNumber: withdraw.bank_number,
          bankCode: withdraw.bank_code,
          gatewayType: withdraw.gateway_type,
          status: withdraw.status,
          createdAt: withdraw.created_at,
          updatedAt: withdraw.updated_at,
          completedAt: withdraw.completed_at,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting withdraw status: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get("balance")
  @ApiSecurity("API Token")
  @ApiOperation({
    summary: "Get account balance",
    description: "ดูยอดเงินคงเหลือในบัญชี Payment Gateway",
  })
  @ApiResponse({
    status: 200,
    description: "Balance retrieved successfully",
    content: {
      "application/json": {
        example: {
          success: true,
          balance: 1000000,
          currency: "LAK",
          gatewayType: "bibpay",
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid parameters or token",
    content: {
      "application/json": {
        example: {
          statusCode: 400,
          message: "Missing required parameter: API Token",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or inactive token",
    content: {
      "application/json": {
        example: {
          statusCode: 401,
          message: "Invalid token: token not found",
        },
      },
    },
  })
  async getBalance(@Req() request: Request) {
    try {
      this.logger.log("Getting account balance");
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

      const result = await this.paymentService.getBalance(uuid);

      if (result.success) {
        return {
          success: true,
          balance: result.balance,
          currency: result.currency,
          gatewayType: result.gatewayType,
        };
      } else {
        throw new HttpException(
          result.message || "Failed to get balance",
          HttpStatus.BAD_REQUEST
        );
      }
    } catch (error) {
      this.logger.error(`Error getting balance: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || "Internal server error",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
