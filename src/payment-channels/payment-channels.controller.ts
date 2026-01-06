import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Request,
  Param,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from "@nestjs/swagger";
import { PaymentChannelsService } from "./payment-channels.service";
import {
  CreatePaymentChannelDto,
  UpdatePaymentChannelDto,
  DeletePaymentChannelDto,
  PaymentChannelsResponseDto,
  CreatePaymentChannelResponseDto,
  UpdatePaymentChannelResponseDto,
  DeletePaymentChannelResponseDto,
} from "./dto/payment-channels.dto";

@ApiTags("Payment Channels")
@ApiSecurity("API Token")
@Controller()
export class PaymentChannelsController {
  constructor(
    private readonly paymentChannelsService: PaymentChannelsService
  ) {}

  private async extractAndValidateUuid(request: any): Promise<string> {
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
        "Missing Authorization header. Use: Bearer <API Token>",
        HttpStatus.UNAUTHORIZED
      );
    }

    // ตรวจสอบว่า token valid หรือไม่
    const { isBoTokenValid } = await import("../lib/bo-token-utils");
    const isValid = await isBoTokenValid(uuid);

    if (!isValid) {
      throw new HttpException(
        "Invalid or inactive API Token",
        HttpStatus.UNAUTHORIZED
      );
    }

    return uuid;
  }

  @Get("payment-channels")
  @ApiOperation({
    summary: "Get all payment channels and supported payment systems",
    description:
      "Retrieve all payment channels configured for the authenticated token, including supported payment systems and channel details",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved payment channels",
    type: PaymentChannelsResponseDto,
    content: {
      "application/json": {
        example: {
          success: true,
          message: null,
          data: {
            allPaymentSys: ["BIB-pay", "PayOneX"],
            channels: [
              {
                id: 1,
                type: "payment_gateway",
                bankCode: null,
                bankNo: null,
                bankName: null,
                enable: true,
                autoDeposit: true,
                autoWithdraw: true,
                payment_sys: "bib-pay",
              },
              {
                id: 2,
                type: "bank_sms",
                bankCode: "004",
                bankNo: "1234567890",
                bankName: "สมชาย ใจดี",
                enable: true,
                autoDeposit: true,
                autoWithdraw: false,
                payment_sys: null,
              },
              {
                id: 3,
                type: "bank_slip",
                bankCode: "014",
                bankNo: "9876543210",
                bankName: "สมหญิง ใจงาม",
                enable: false,
                autoDeposit: true,
                autoWithdraw: false,
                payment_sys: null,
              },
              {
                id: 4,
                type: "bank_sms",
                bankCode: "020",
                bankNo: "5555555555",
                bankName: "สมศักดิ์ ใจดี",
                enable: true,
                autoDeposit: false,
                autoWithdraw: true,
                payment_sys: null,
              },
            ],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing API Token",
    content: {
      "application/json": {
        example: {
          success: false,
          message: "Invalid or inactive API Token",
        },
      },
    },
  })
  async getPaymentChannels(
    @Request() req: any
  ): Promise<PaymentChannelsResponseDto> {
    const tokenUuid = await this.extractAndValidateUuid(req);
    return this.paymentChannelsService.getPaymentChannels(tokenUuid);
  }

  @Get("payment-channels/:id")
  @ApiOperation({
    summary: "Get payment channel by ID",
    description:
      "Retrieve a specific payment channel by its ID for the authenticated token",
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved payment channel",
    content: {
      "application/json": {
        example: {
          success: true,
          message: null,
          data: {
            id: 1,
            type: "bank_sms",
            bankCode: "014",
            bankNo: "1234567890",
            bankName: "สมชาย ใจดี",
            enable: true,
            autoDeposit: true,
            autoWithdraw: false,
            payment_sys: null,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Payment channel not found",
    content: {
      "application/json": {
        example: {
          success: false,
          message: "Payment channel not found",
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing API Token",
    content: {
      "application/json": {
        example: {
          success: false,
          message: "Invalid or inactive API Token",
        },
      },
    },
  })
  async getPaymentChannelById(
    @Param("id") id: string,
    @Request() req: any
  ): Promise<CreatePaymentChannelResponseDto> {
    const tokenUuid = await this.extractAndValidateUuid(req);
    return this.paymentChannelsService.getPaymentChannelById(
      parseInt(id),
      tokenUuid
    );
  }

  @Post("create-payment-channels")
  @ApiOperation({
    summary: "Create a new payment channel",
    description:
      "Create a new payment channel for the authenticated token. Supports three types: payment_gateway (BIB-Pay, PayOneX), bank_sms (SMS notifications), and bank_slip (manual bank slip processing)",
  })
  @ApiBody({
    type: CreatePaymentChannelDto,
    description: "Payment channel configuration data",
    examples: {
      "Payment Gateway - BIB-Pay": {
        summary: "BIB-Pay Payment Gateway",
        description:
          "Create a BIB-Pay payment gateway channel for automatic deposit processing",
        value: {
          type: "payment_gateway",
          bankCode: null,
          bankNo: null,
          bankName: null,
          enable: true,
          autoDeposit: true,
          autoWithdraw: false,
          payment_sys: "bib-pay",
        },
      },
      "Payment Gateway - PayOneX": {
        summary: "PayOneX Payment Gateway",
        description:
          "Create a PayOneX payment gateway channel for automatic withdrawal processing",
        value: {
          type: "payment_gateway",
          bankCode: null,
          bankNo: null,
          bankName: null,
          enable: true,
          autoDeposit: false,
          autoWithdraw: true,
          payment_sys: "payonex",
        },
      },
      "Bank SMS Channel": {
        summary: "Bank SMS Channel",
        description:
          "Create a bank SMS channel for receiving SMS notifications from specific bank account",
        value: {
          type: "bank_sms",
          bankCode: "014",
          bankNo: "1234567890",
          bankName: "สมชาย ใจดี",
          enable: true,
          autoDeposit: true,
          autoWithdraw: false,
          payment_sys: null,
        },
      },
      "Bank Slip Channel": {
        summary: "Bank Slip Channel",
        description:
          "Create a bank slip channel for manual bank slip processing",
        value: {
          type: "bank_slip",
          bankCode: "004",
          bankNo: "9876543210",
          bankName: "สมหญิง ใจงาม",
          enable: true,
          autoDeposit: false,
          autoWithdraw: true,
          payment_sys: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Payment channel created successfully",
    type: CreatePaymentChannelResponseDto,
    content: {
      "application/json": {
        example: {
          success: true,
          message: null,
          data: {
            id: 1,
            type: "bank_sms",
            bankCode: "014",
            bankNo: "1234567890",
            bankName: "สมชาย ใจดี",
            enable: true,
            autoDeposit: true,
            autoWithdraw: false,
            payment_sys: null,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Invalid input data",
    content: {
      "application/json": {
        examples: {
          "Missing Payment System": {
            summary: "Missing payment_sys for payment_gateway",
            value: {
              success: false,
              message: "payment_sys is required for payment_gateway type",
            },
          },
          "Missing Bank Info": {
            summary: "Missing bank information for bank_sms/bank_slip",
            value: {
              success: false,
              message:
                "Bank information is required for bank_sms and bank_slip types",
            },
          },
          "Invalid Payment System": {
            summary: "Unsupported payment system",
            value: {
              success: false,
              message: "Unsupported payment system: invalid-system",
            },
          },
          "Duplicate Payment Gateway": {
            summary: "Payment gateway already exists",
            value: {
              success: false,
              message:
                "Payment gateway already exists. Only one payment gateway is allowed per token.",
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing API Token",
    content: {
      "application/json": {
        example: {
          success: false,
          message: "Invalid or inactive API Token",
        },
      },
    },
  })
  async createPaymentChannel(
    @Body() createDto: CreatePaymentChannelDto,
    @Request() req: any
  ): Promise<CreatePaymentChannelResponseDto> {
    const tokenUuid = await this.extractAndValidateUuid(req);
    return this.paymentChannelsService.createPaymentChannel(
      createDto,
      tokenUuid
    );
  }

  @Put("update-payment-channels")
  @ApiOperation({
    summary: "Update an existing payment channel",
    description:
      "Update an existing payment channel configuration. All fields are required for the update operation.",
  })
  @ApiBody({
    type: UpdatePaymentChannelDto,
    description: "Updated payment channel configuration data",
    examples: {
      "Update Bank SMS Channel": {
        summary: "Update Bank SMS Channel",
        description: "Update bank SMS channel settings",
        value: {
          id: 1,
          type: "bank_sms",
          bankCode: "004",
          bankNo: "9876543210",
          bankName: "สมหญิง ใจงาม",
          enable: false,
          autoDeposit: false,
          autoWithdraw: true,
          payment_sys: null,
        },
      },
      "Update Payment Gateway": {
        summary: "Update Payment Gateway",
        description: "Update payment gateway channel settings",
        value: {
          id: 2,
          type: "payment_gateway",
          bankCode: null,
          bankNo: null,
          bankName: null,
          enable: true,
          autoDeposit: true,
          autoWithdraw: true,
          payment_sys: "payonex",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Payment channel updated successfully",
    type: UpdatePaymentChannelResponseDto,
    content: {
      "application/json": {
        example: {
          success: true,
          message: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Invalid input data",
    content: {
      "application/json": {
        examples: {
          "Missing Payment System": {
            summary: "Missing payment_sys for payment_gateway",
            value: {
              success: false,
              message: "payment_sys is required for payment_gateway type",
            },
          },
          "Missing Bank Info": {
            summary: "Missing bank information for bank_sms/bank_slip",
            value: {
              success: false,
              message:
                "Bank information is required for bank_sms and bank_slip types",
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing API Token",
    content: {
      "application/json": {
        example: {
          success: false,
          message: "Invalid or inactive API Token",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Not Found - Payment channel not found",
    content: {
      "application/json": {
        example: {
          success: false,
          message: "Payment channel not found",
        },
      },
    },
  })
  async updatePaymentChannel(
    @Body() updateDto: UpdatePaymentChannelDto,
    @Request() req: any
  ): Promise<UpdatePaymentChannelResponseDto> {
    const tokenUuid = await this.extractAndValidateUuid(req);
    return this.paymentChannelsService.updatePaymentChannel(
      updateDto,
      tokenUuid
    );
  }

  @Delete("delete-payment-channels")
  @ApiOperation({
    summary: "Delete a payment channel",
    description:
      "Delete an existing payment channel by ID. This action cannot be undone.",
  })
  @ApiBody({
    type: DeletePaymentChannelDto,
    description: "Payment channel deletion data",
    examples: {
      "Delete Channel": {
        summary: "Delete Payment Channel",
        description: "Delete a payment channel by ID",
        value: {
          id: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Payment channel deleted successfully",
    type: DeletePaymentChannelResponseDto,
    content: {
      "application/json": {
        example: {
          success: true,
          message: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing API Token",
    content: {
      "application/json": {
        example: {
          success: false,
          message: "Invalid or inactive API Token",
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "Not Found - Payment channel not found",
    content: {
      "application/json": {
        example: {
          success: false,
          message: "Payment channel not found",
        },
      },
    },
  })
  async deletePaymentChannel(
    @Body() deleteDto: DeletePaymentChannelDto,
    @Request() req: any
  ): Promise<DeletePaymentChannelResponseDto> {
    const tokenUuid = await this.extractAndValidateUuid(req);
    return this.paymentChannelsService.deletePaymentChannel(
      deleteDto,
      tokenUuid
    );
  }
}
