import { IsString, IsBoolean, IsOptional, IsInt, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

// Base Response DTO
export class BaseResponseDto {
  @ApiProperty({
    example: true,
    description: "Indicates if the request was successful",
  })
  success: boolean;

  @ApiProperty({
    example: null,
    description: "Error message if any",
    required: false,
  })
  message?: string;
}

// Payment Channel Data DTO
export class PaymentChannelDataDto {
  @ApiProperty({
    example: 1,
    description: "Unique identifier for the payment channel",
  })
  id: number;

  @ApiProperty({
    example: "bank_sms",
    description: "Type of payment channel",
    enum: ["payment_gateway", "bank_sms", "bank_slip"],
  })
  type: string;

  @ApiProperty({
    example: "004",
    description: "Bank code (null for payment_gateway type)",
    required: false,
  })
  bankCode?: string;

  @ApiProperty({
    example: "1234567890",
    description: "Bank account number (null for payment_gateway type)",
    required: false,
  })
  bankNo?: string;

  @ApiProperty({
    example: "สมชาย ใจดี",
    description: "Bank account name (null for payment_gateway type)",
    required: false,
  })
  bankName?: string;

  @ApiProperty({
    example: true,
    description: "Whether the payment channel is enabled",
  })
  enable: boolean;

  @ApiProperty({
    example: true,
    description: "Whether automatic deposit processing is enabled",
  })
  autoDeposit: boolean;

  @ApiProperty({
    example: false,
    description: "Whether automatic withdrawal processing is enabled",
  })
  autoWithdraw: boolean;

  @ApiProperty({
    example: "bibpay",
    description: "Payment system (only for payment_gateway type)",
    enum: ["bibpay", "payonex"],
    required: false,
  })
  payment_sys?: string; // สำหรับ type "payment_gateway" เท่านั้น
}

// Get Payment Channels Response DTO
export class PaymentChannelsResponseDto extends BaseResponseDto {
  @ApiProperty({
    description: "Payment channels data",
    required: false,
    example: {
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
  })
  data?: {
    allPaymentSys: string[];
    channels: PaymentChannelDataDto[];
  };
}

// Create Payment Channel Request DTO
export class CreatePaymentChannelDto {
  @ApiProperty({
    description: "Type of payment channel",
    enum: ["payment_gateway", "bank_sms", "bank_slip"],
    examples: {
      payment_gateway: {
        value: "payment_gateway",
        description: "Payment gateway channel (BIB-Pay, PayOneX)",
      },
      bank_sms: {
        value: "bank_sms",
        description: "Bank SMS channel",
      },
      bank_slip: {
        value: "bank_slip",
        description: "Bank slip channel",
      },
    },
  })
  @IsString()
  @IsIn(["payment_gateway", "bank_sms", "bank_slip"])
  type: string;

  @ApiProperty({
    example: "004",
    description:
      "Bank code (required for bank_sms and bank_slip, null for payment_gateway). Common codes: 002=ธนาคารกรุงเทพ, 004=ธนาคารกสิกรไทย, 006=ธนาคารกรุงไทย, 014=ธนาคารไทยพาณิชย์, 020=ธนาคารกรุงศรีอยุธยา, 022=ธนาคารเกียรตินาคิน, 024=ธนาคารยูโอบี, 025=ธนาคารธนชาต, 030=ธนาคารออมสิน, 034=ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร, 040=ธนาคารอาคารสงเคราะห์, 045=ธนาคารอิสลามแห่งประเทศไทย, 047=ธนาคารทิสโก้, 048=ธนาคารเกียรตินาคิน, 069=ธนาคารกสิกรไทย, 070=ธนาคารไทยพาณิชย์, 071=ธนาคารกรุงเทพ, 073=ธนาคารกรุงไทย, 075=ธนาคารกรุงศรีอยุธยา, 076=ธนาคารยูโอบี, 077=ธนาคารธนชาต, 078=ธนาคารออมสิน, 079=ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร, 081=ธนาคารอาคารสงเคราะห์, 082=ธนาคารอิสลามแห่งประเทศไทย, 084=ธนาคารทิสโก้, 085=ธนาคารเกียรตินาคิน, 087=ธนาคารกสิกรไทย, 088=ธนาคารไทยพาณิชย์, 089=ธนาคารกรุงเทพ, 090=ธนาคารกรุงไทย, 091=ธนาคารกรุงศรีอยุธยา, 092=ธนาคารยูโอบี, 093=ธนาคารธนชาต, 094=ธนาคารออมสิน, 095=ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร, 096=ธนาคารอาคารสงเคราะห์, 097=ธนาคารอิสลามแห่งประเทศไทย, 098=ธนาคารทิสโก้, 099=ธนาคารเกียรตินาคิน",
    required: false,
    enum: [
      "002",
      "004",
      "006",
      "014",
      "020",
      "022",
      "024",
      "025",
      "030",
      "034",
      "040",
      "045",
      "047",
      "048",
      "069",
      "070",
      "071",
      "073",
      "075",
      "076",
      "077",
      "078",
      "079",
      "081",
      "082",
      "084",
      "085",
      "087",
      "088",
      "089",
      "090",
      "091",
      "092",
      "093",
      "094",
      "095",
      "096",
      "097",
      "098",
      "099",
    ],
  })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiProperty({
    example: null,
    description:
      "Bank account number (required for bank_sms and bank_slip, null for payment_gateway)",
    required: false,
  })
  @IsOptional()
  @IsString()
  bankNo?: string;

  @ApiProperty({
    example: null,
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
    example: "bibpay",
    description: "Payment system (required for payment_gateway type only)",
    enum: ["bibpay", "payonex"],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(["bibpay", "payonex"])
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
    example: "payonex",
    description: "Payment system (required for payment_gateway type only)",
    enum: ["bibpay", "payonex"],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(["bibpay", "payonex"])
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
