import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsUrl, IsNotEmpty } from 'class-validator';

export class CreateWithdrawDto {
  @ApiProperty({
    description: 'รหัสอ้างอิงธุรกรรม (Transaction reference code)',
    example: 'WIT001',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  refCode: string;

  @ApiProperty({
    description: 'จำนวนเงินที่ต้องการถอน (Amount to withdraw)',
    example: 50000,
    required: true
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'ชื่อบัญชีผู้ถอน (Account holder name)',
    example: 'Jane Doe',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({
    description: 'เลขบัญชีผู้ถอน (Account number)',
    example: '0987654321',
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
