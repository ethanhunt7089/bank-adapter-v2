import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class StatusRequestDto {
  @ApiProperty({
    description: "Reference code for the transaction",
    example: "DEP001",
  })
  @IsString()
  @IsNotEmpty()
  refCode: string;
}
