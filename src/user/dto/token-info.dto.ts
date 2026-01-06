import { ApiProperty } from "@nestjs/swagger";

export class TokenInfoDto {
  @ApiProperty({
    description: "Token UUID",
    example: "cd0b4522-1f02-4f97-9856-fb7153392ebb",
  })
  token: string;

  @ApiProperty({
    description: "Target domain",
    example: "https://example.com",
  })
  targetDomain: string;

  @ApiProperty({
    description: "Payment system",
    example: "payonex",
  })
  paymentSys: string;

  @ApiProperty({
    description: "Deposit enabled",
    example: true,
  })
  deposit: boolean;

  @ApiProperty({
    description: "Withdraw enabled",
    example: false,
  })
  withdraw: boolean;

  @ApiProperty({
    description: "Token active status",
    example: true,
  })
  isActive: boolean;
}

export class TokenInfoResponseDto {
  @ApiProperty({
    description: "Success status",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "Token information",
    type: TokenInfoDto,
  })
  data: TokenInfoDto;
}
