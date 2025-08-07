import { Controller, Get, HttpException, HttpStatus, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';

@ApiTags('Banking')
@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('transactions')
  @ApiOperation({ 
    summary: 'Get transactions list', 
    description: 'ดึงรายการธุรกรรมจากระบบ BCEL1 โดยสามารถกรองข้อมูลตามเลขบัญชี ชื่อบัญชี และวันที่ได้ (Retrieve transaction list from BCEL1 system with optional filters for account number, account name, and date)'
  })
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({ name: 'fromBankAccountNumber', required: false, description: 'Filter by bank account number(BCEL1 ACCOUNT NUMBER)', example: '110-12-00-1234567-001' })
  @ApiQuery({ name: 'fromName', required: false, description: 'Filter by account name(BCEL1 ACCOUNT NAME)', example: 'PHOUSIT SOUPHIDA MR' })
  @ApiQuery({ 
    name: 'fromDate', 
    required: false, 
    description: 'Filter by date (YYYY-MM-DD HH:MM:SS) หรือใส่ 0 เพื่อดึงข้อมูลของวันนี้ (or use 0 to get today data)', 
    examples: {
      specificDate: {
        value: '2025-08-05 16:08:00',
        description: 'ระบุวันที่เฉพาะ'
      },
      todayData: {
        value: '0',
        description: 'ดึงข้อมูลของวันนี้'
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Transactions retrieved successfully',
    content: {
      'application/json': {
        example: {
          "success": true,
          "transactionTimestamp": "2025-08-06T03:06:41.000Z",
          "data": {
            "success": true,
            "transactions": [
              {
                "id": "5f89f1ad-ca1b-4f0b-8e87-1974d881063c",
                "creditType": "DEPOSIT_AUTO",
                "amount": "50000",
                "status": "PENDING",
                "fromName": "PHOUSIT SOUPHIDA MR",
                "fromBankCode": "BCEL",
                "fromBankAccountNumber": "010-12-00-xxxxx282-001",
                "toName": "PEELAR HOMSOMBUT MR",
                "toBankCode": "BCEL",
                "toBankAccountNumber": "0901230513851",
                "remarks": "PHOUSIT SOUPHIDA MR - 010-12-00-xxxxx282-001",
                "transferDateTime": "2025-08-05T20:06:41.000Z",
                "createdAt": "2025-08-06T14:42:17.046Z",
                "customerId": null,
                "createdById": null,
                "updatedAt": "2025-08-06T14:42:17.046Z",
                "deletedAt": null,
                "currency": "LAK",
                "referenceNumber": "202508062114292",
                "afterCredit": null,
                "amountCredit": null,
                "beforeCredit": null,
                "isNotified": false,
                "confirmOTP": null,
                "bcelOneId": null,
                "transferDateTimeV2": "2025-08-06T03:06:41.000Z",
                "statementTime": "06/08/2025 03:06:41",
                "customer": null,
                "createdBy": null
              }
            ]
          }
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
  async getTransactions(
    @Request() req: any,
    @Query('fromBankAccountNumber') fromBankAccountNumber?: string,
    @Query('fromName') fromName?: string,
    @Query('fromDate') fromDate?: string
  ) {
    try {
      // ตรวจสอบ token
      const authorization = req.headers.authorization;
      console.log('🔍 Authorization header:', authorization);
      
      if (!authorization || !authorization.startsWith('Bearer ')) {
        console.log('❌ Invalid authorization header format');
        throw new HttpException('Missing or invalid authorization header', HttpStatus.UNAUTHORIZED);
      }

      const token = authorization.replace('Bearer ', '');
      const isValidToken = await this.transactionsService.validateToken(token);
      
      if (!isValidToken) {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }

      // เรียก backend API
      const result = await this.transactionsService.processGetTransactions({
        fromBankAccountNumber,
        fromName,
        fromDate
      }, token);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Get transactions error:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
