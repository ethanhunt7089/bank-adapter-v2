import { Controller, Get, HttpException, HttpStatus, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';

@ApiTags('Banking')
@Controller('bcel-api')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('transactions')
  @ApiOperation({ 
    summary: 'Get transactions list', 
    description: 'ดึงรายการธุรกรรมจากระบบ BCEL1 โดยสามารถกรองข้อมูลตามเลขบัญชี ชื่อบัญชี และวันที่ได้ (Retrieve transaction list from BCEL1 system with optional filters for account number, account name, and date)',
    operationId: 'bcel-api/transactions'
  })
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({ name: 'fromBankAccountNumber', required: false, description: 'Filter by bank account number(BCEL1 ACCOUNT NUMBER)', example: '110-12-00-1234567-001' })
  @ApiQuery({ name: 'fromName', required: false, description: 'Filter by account name(BCEL1 ACCOUNT NAME)', example: 'PHOUSIT SOUPHIDA MR' })
  @ApiQuery({ 
    name: 'fromDate', 
    required: false, 
    description: 'Filter by date (YYYY-MM-DD HH:MM:SS) หรือใส่ 0 เพื่อดึงข้อมูลทั้งหมด (or use 0 to get all data)', 
    examples: {
      specificDate: {
        value: '2025-08-05 16:08:00',
        description: 'ระบุวันที่เฉพาะ'
      },
      allData: {
        value: '0',
        description: 'ดึงข้อมูลทั้งหมด (ไม่ filter วันที่)'
      }
    }
  })
  @ApiQuery({ 
    name: 'bankCode', 
    required: false, 
    description: 'Filter by bank code - กรองตามรหัสธนาคาร (Bank code filter)', 
    enum: ['BCEL', 'JDB', 'LDB', 'LVB', 'ACLB', 'APB', 'BIC', 'BOC', 'ICBC', 'IDCB', 'MRB', 'MBB', 'PBB', 'SCB', 'STB', 'VTB', 'BFL'],
    examples: {
      bcel: {
        value: 'BCEL',
        description: 'BCEL BANK'
      },
      scb: {
        value: 'SCB', 
        description: 'SACOMBANK LAO'
      },
      ldb: {
        value: 'LDB',
        description: 'LAO DEVELOPMENT BANK'
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
           "data": {
             "success": true,
             "transactionTimestamp": "2024-08-13T22:43:19.000Z",
             "transactions": [
               {
                 "creditType": "DEPOSIT_AUTO",
                 "amount": "150000",
                 "currency": "LAK",
                 "status": "SUCCESS",
                 "fromName": "PHOUSIT SOUPHIDA MR",
                 "fromBankCode": "BCEL",
                 "fromBankAccountNumber": "010-12-00-xxxxx282-001",
                 "toName": "SAO KIEWLUIVANH MS",
                 "toBankCode": "BCEL",
                 "toBankAccountNumber": "1011229916222",
                 "remarks": "PHOUSIT SOUPHIDA MR - 010-12-00-xxxxx282-001",
                 "transactionTimestamp": "2024-08-13T22:43:19.000Z"
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
    @Query('fromDate') fromDate?: string,
    @Query('bankCode') bankCode?: string
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

      // Log parameters (bankCode ยังไม่ส่งไป backend)
      console.log('📊 Transaction parameters:', {
        fromBankAccountNumber,
        fromName, 
        fromDate,
        bankCode: bankCode || '(not specified)'
      });

      // เรียก backend API (ยังไม่ส่ง bankCode)
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
