import { Controller, Get, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BankAccountService } from './bank-account.service';

@ApiTags('Banking')
@Controller('bcel-api')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Get('bank-account')
  @ApiOperation({
    summary: 'Get bank accounts list',
    description: 'ดึงรายการบัญชีธนาคาร BCEL1 ที่พร้อมใช้งานสำหรับฝาก/ถอนเงิน (Get available BCEL1 bank accounts for deposit/withdraw operations)',
    operationId: 'bcel-api/bank-account'
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Bank accounts retrieved successfully',
    content: {
      'application/json': {
        example: {
          "success": true,
          "data": [
            {
              "id": "bcel_001",
              "accountNumber": "110-12-00-1234567-001",
              "accountName": "COMPANY DEPOSIT MR",
              "bankCode": "BCEL",
              "acc_type": "DEPOSIT",
              "currency": "LAK",
              "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            },
            {
              "id": "bcel_002",
              "accountNumber": "110-12-00-7654321-002", 
              "accountName": "COMPANY WITHDRAW MR",
              "bankCode": "BCEL",
              "acc_type": "WITHDRAW",
              "currency": "LAK",
              "qrCode": null
            }
          ]
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid token',
    content: {
      'application/json': {
        example: {
          "statusCode": 401,
          "message": "Missing or invalid authorization header"
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    content: {
      'application/json': {
        example: {
          "statusCode": 500,
          "message": "Failed to fetch bank accounts"
        }
      }
    }
  })
  async getBankAccounts(@Request() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error('Missing or invalid authorization header');
    }

    console.log('🏦 Getting bank accounts...');
    
    try {
      const result = await this.bankAccountService.getBankAccounts(token);
      
      console.log('Bank Accounts Log:', {
        endpoint: '/bank-account',
        method: 'GET',
        statusCode: 200,
        accountsCount: result.data?.length || 0,
        isSuccess: true
      });

      return result;
    } catch (error) {
      console.error('Bank accounts error:', error);
      
      console.log('Bank Accounts Error Log:', {
        endpoint: '/bank-account',
        method: 'GET',
        responseBody: JSON.stringify({ error: error.message }),
        statusCode: error.status || 500,
        isSuccess: false
      });

      throw error;
    }
  }
}
