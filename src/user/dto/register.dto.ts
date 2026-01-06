import { IsString, IsNotEmpty, MinLength, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({
    description: "Username for login",
    example: "admin",
    minLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: "Password for login",
    example: "password123",
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: "Token UUID from bo_token table",
    example: "cd0b4522-1f02-4f97-9856-fb7153392ebb",
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  tokenUuid: string;
}
