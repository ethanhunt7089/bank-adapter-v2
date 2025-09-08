import { IsString, IsBoolean, IsOptional, IsInt, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

// Base Response DTO
export class BaseResponseDto {
  success: boolean;
  message?: string;
}

// Payment Channel Data DTO
export class PaymentChannelDataDto {
  id: number;
  type: string;
  bankCode?: string;
  bankNo?: string;
  bankName?: string;
  enable: boolean;
  autoDeposit: boolean;
  autoWithdraw: boolean;
  payment_sys?: string; // สำหรับ type "payment_gateway" เท่านั้น
}

// Get Payment Channels Response DTO
export class PaymentChannelsResponseDto extends BaseResponseDto {
  data?: {
    allPaymentSys: string[];
    channels: PaymentChannelDataDto[];
  };
}

// Create Payment Channel Request DTO
export class CreatePaymentChannelDto {
  @ApiProperty({
    example: "payment_gateway",
    description: "Type of payment channel",
    enum: ["payment_gateway", "bank_sms", "bank_slip"],
  })
  @IsString()
  @IsIn(["payment_gateway", "bank_sms", "bank_slip"])
  type: string;

  @ApiProperty({
    example: "014",
    description:
      "Bank code (required for bank_sms and bank_slip, null for payment_gateway)",
    required: false,
  })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiProperty({
    example: "1234567890",
    description:
      "Bank account number (required for bank_sms and bank_slip, null for payment_gateway)",
    required: false,
  })
  @IsOptional()
  @IsString()
  bankNo?: string;

  @ApiProperty({
    example: "สมชาย ใจดี",
    description:
      "Bank account name (required for bank_sms and bank_slip, null for payment_gateway)",
    required: false,
  })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({
    example: true,
    description: "Enable/disable the payment channel",
  })
  @IsBoolean()
  enable: boolean;

  @ApiProperty({
    example: true,
    description: "Enable automatic deposit processing",
  })
  @IsBoolean()
  autoDeposit: boolean;

  @ApiProperty({
    example: false,
    description: "Enable automatic withdrawal processing",
  })
  @IsBoolean()
  autoWithdraw: boolean;

  @ApiProperty({
    example: "bib-pay",
    description: "Payment system (required for payment_gateway type only)",
    enum: ["bib-pay", "onepay"],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(["bib-pay", "onepay"])
  payment_sys?: string; // สำหรับ type "payment_gateway" เท่านั้น
}

// Create Payment Channel Response DTO
export class CreatePaymentChannelResponseDto extends BaseResponseDto {
  data?: PaymentChannelDataDto;
}

// Update Payment Channel Request DTO
export class UpdatePaymentChannelDto {
  @ApiProperty({
    example: 1,
    description: "Payment channel ID to update",
  })
  @IsInt()
  id: number;

  @ApiProperty({
    example: "bank_sms",
    description: "Type of payment channel",
    enum: ["payment_gateway", "bank_sms", "bank_slip"],
  })
  @IsString()
  @IsIn(["payment_gateway", "bank_sms", "bank_slip"])
  type: string;

  @ApiProperty({
    example: "014",
    description:
      "Bank code (required for bank_sms and bank_slip, null for payment_gateway)",
    required: false,
  })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiProperty({
    example: "9876543210",
    description:
      "Bank account number (required for bank_sms and bank_slip, null for payment_gateway)",
    required: false,
  })
  @IsOptional()
  @IsString()
  bankNo?: string;

  @ApiProperty({
    example: "สมหญิง ใจงาม",
    description:
      "Bank account name (required for bank_sms and bank_slip, null for payment_gateway)",
    required: false,
  })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({
    example: false,
    description: "Enable/disable the payment channel",
  })
  @IsBoolean()
  enable: boolean;

  @ApiProperty({
    example: false,
    description: "Enable automatic deposit processing",
  })
  @IsBoolean()
  autoDeposit: boolean;

  @ApiProperty({
    example: true,
    description: "Enable automatic withdrawal processing",
  })
  @IsBoolean()
  autoWithdraw: boolean;

  @ApiProperty({
    example: "onepay",
    description: "Payment system (required for payment_gateway type only)",
    enum: ["bib-pay", "onepay"],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(["bib-pay", "onepay"])
  payment_sys?: string; // สำหรับ type "payment_gateway" เท่านั้น
}

// Update Payment Channel Response DTO
export class UpdatePaymentChannelResponseDto extends BaseResponseDto {}

// Delete Payment Channel Request DTO
export class DeletePaymentChannelDto {
  @ApiProperty({
    example: 1,
    description: "Payment channel ID to delete",
  })
  @IsInt()
  id: number;
}

// Delete Payment Channel Response DTO
export class DeletePaymentChannelResponseDto extends BaseResponseDto {}
