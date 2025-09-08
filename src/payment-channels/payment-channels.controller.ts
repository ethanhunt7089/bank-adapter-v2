import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Request,
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
    const { isTokenValid } = await import("../lib/token-utils");
    const isValid = await isTokenValid(uuid);

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
  })
  @ApiResponse({
    status: 200,
    description: "Successfully retrieved payment channels",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing API Token",
  })
  async getPaymentChannels(
    @Request() req: any
  ): Promise<PaymentChannelsResponseDto> {
    const tokenUuid = await this.extractAndValidateUuid(req);
    return this.paymentChannelsService.getPaymentChannels(tokenUuid);
  }

  @Post("create-payment-channels")
  @ApiOperation({ summary: "Create a new payment channel" })
  @ApiBody({
    type: CreatePaymentChannelDto,
    examples: {
      "Payment Gateway - BIB-Pay": {
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
      "Payment Gateway - OnePayX": {
        value: {
          type: "payment_gateway",
          bankCode: null,
          bankNo: null,
          bankName: null,
          enable: true,
          autoDeposit: false,
          autoWithdraw: true,
          payment_sys: "onepay",
        },
      },
      "Bank SMS": {
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
      "Bank Slip": {
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
  })
  @ApiResponse({ status: 400, description: "Bad Request - Invalid input data" })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing API Token",
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
  @ApiOperation({ summary: "Update an existing payment channel" })
  @ApiResponse({
    status: 200,
    description: "Payment channel updated successfully",
  })
  @ApiResponse({ status: 400, description: "Bad Request - Invalid input data" })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing API Token",
  })
  @ApiResponse({
    status: 404,
    description: "Not Found - Payment channel not found",
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
  @ApiOperation({ summary: "Delete a payment channel" })
  @ApiResponse({
    status: 200,
    description: "Payment channel deleted successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing API Token",
  })
  @ApiResponse({
    status: 404,
    description: "Not Found - Payment channel not found",
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
