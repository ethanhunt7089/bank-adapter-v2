import { IsString, IsBoolean, IsOptional, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateTokenDto {
  @ApiProperty({
    description: "Payment system to use",
    example: "payonex",
    enum: ["payonex", "bibpay"],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(["payonex", "bibpay"])
  paymentSys?: string;

  @ApiProperty({
    description: "Enable deposit functionality",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  deposit?: boolean;

  @ApiProperty({
    description: "Enable withdraw functionality",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  withdraw?: boolean;
}
