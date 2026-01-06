import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsNotEmpty, IsUrl } from "class-validator";

export class CreateDepositDto {
  @ApiProperty({
    description: "รหัสอ้างอิงธุรกรรม",
    example: "DEP-CHONLAPAT-001",
  })
  @IsString()
  @IsNotEmpty()
  refCode: string;

  @ApiProperty({
    description: "จำนวนเงิน (บาท)",
    example: 100000,
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: "ชื่อเจ้าของบัญชี",
    example: "John Doe",
  })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({
    description: "เลขบัญชีธนาคาร",
    example: "0288731497",
  })
  @IsString()
  @IsNotEmpty()
  bankNumber: string;

  @ApiProperty({
    description: "รหัสธนาคาร (014 = กสิกรไทย)",
    example: "014",
  })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({
    description: "URL สำหรับรับ webhook จาก Payment Gateway",
    example: "https://central-dragon-11.com/bcel-api/webhooks/bibpay",
  })
  @IsUrl()
  @IsNotEmpty()
  callbackUrl: string;
}
