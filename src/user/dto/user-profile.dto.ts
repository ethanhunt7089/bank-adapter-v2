import { ApiProperty } from "@nestjs/swagger";

export class UserProfileDto {
  @ApiProperty({
    description: "User ID",
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: "Username",
    example: "admin",
  })
  username: string;

  @ApiProperty({
    description: "User active status",
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: "Token UUID associated with user",
    example: "cd0b4522-1f02-4f97-9856-fb7153392ebb",
  })
  tokenUuid: string;

  @ApiProperty({
    description: "User creation date",
    example: "2025-01-09T12:00:00Z",
  })
  createdAt: Date;
}

export class UserProfileResponseDto {
  @ApiProperty({
    description: "Success status",
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: "User profile data",
    type: UserProfileDto,
  })
  data: UserProfileDto;
}
