import { IsString, IsBoolean, IsOptional, IsInt, IsIn } from "class-validator";

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
  @IsString()
  @IsIn(["payment_gateway", "bank_sms", "bank_slip"])
  type: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  bankNo?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsBoolean()
  enable: boolean;

  @IsBoolean()
  autoDeposit: boolean;

  @IsBoolean()
  autoWithdraw: boolean;

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
  @IsInt()
  id: number;

  @IsString()
  @IsIn(["payment_gateway", "bank_sms", "bank_slip"])
  type: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  bankNo?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsBoolean()
  enable: boolean;

  @IsBoolean()
  autoDeposit: boolean;

  @IsBoolean()
  autoWithdraw: boolean;

  @IsOptional()
  @IsString()
  @IsIn(["bib-pay", "onepay"])
  payment_sys?: string; // สำหรับ type "payment_gateway" เท่านั้น
}

// Update Payment Channel Response DTO
export class UpdatePaymentChannelResponseDto extends BaseResponseDto {}

// Delete Payment Channel Request DTO
export class DeletePaymentChannelDto {
  @IsInt()
  id: number;
}

// Delete Payment Channel Response DTO
export class DeletePaymentChannelResponseDto extends BaseResponseDto {}
