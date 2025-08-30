import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsUrl, IsNotEmpty } from 'class-validator';

export class CreateDepositDto {
  @ApiProperty({
    description: 'รหัสอ้างอิงธุรกรรม (Transaction reference code)',
    example: 'DEP001',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  refCode: string;

  @ApiProperty({
    description: 'จำนวนเงินที่ต้องการฝาก (Amount to deposit)',
    example: 100000,
    required: true
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'ชื่อบัญชีผู้ฝาก (Account holder name)',
    example: 'John Doe',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({
    description: 'เลขบัญชีผู้ฝาก (Account number)',
    example: '1234567890',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  bankNumber: string;

  @ApiProperty({
    description: 'รหัสธนาคาร (Bank code)',
    example: 'BCEL',
    required: true,
    enum: ['BCEL', 'SCB', 'JDB', 'LDB', 'LVB', 'ACLB', 'APB', 'BIC', 'BOC', 'ICBC', 'IDCB', 'MRB', 'MBB', 'PBB', 'STB', 'VTB', 'BFL']
  })
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @ApiProperty({
    description: 'URL สำหรับ callback เมื่อธุรกรรมเสร็จสิ้น (Callback URL for transaction completion)',
    example: 'https://example.com/callback',
    required: true
  })
  @IsUrl()
  @IsNotEmpty()
  callbackUrl: string;
}
