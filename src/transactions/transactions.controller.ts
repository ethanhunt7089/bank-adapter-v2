import { Controller, Get, Headers, HttpException, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';

@ApiTags('Banking')
@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('transactions')
  @ApiOperation({ 
    summary: 'Get transactions list', 
    description: 'ดึงรายการธุรกรรมจากระบบ BCEL1 โดยสามารถกรองข้อมูลตามเลขบัญชี ชื่อบัญชี และวันที่ได้ (Retrieve transaction list from BCEL1 system with optional filters for account number, account name, and date)',
    operationId: 'transactions'
  })
  // ไม่รับ uuid จาก query อีกต่อไป ใช้ Authorization header แทน
  @ApiQuery({ name: 'fromBankAccountNumber', required: false, description: 'Filter by bank account number(BCEL1 ACCOUNT NUMBER)', example: '110-12-00-1234567-001' })
  @ApiQuery({ name: 'fromName', required: false, description: 'Filter by account name(BCEL1 ACCOUNT NAME)', example: 'PHOUSIT SOUPHIDA MR' })
  // ไม่รับ fromDate แล้ว ระบบจะคำนวนเองจาก cursor ต่อ API Token
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
    @Headers('authorization') authorization: string,
    @Query('fromBankAccountNumber') fromBankAccountNumber?: string,
    @Query('fromName') fromName?: string,
    @Query('bankCode') bankCode?: string
  ) {
    try {
      // ดึง uuid จาก Authorization: Bearer <uuid>
      let uuid: string | undefined;
      const match = /^\s*Bearer\s+(.+)\s*$/i.exec(authorization ?? '');
      if (match && match[1]) {
        let candidate = match[1].trim();
        if ((candidate.startsWith('"') && candidate.endsWith('"')) || (candidate.startsWith("'") && candidate.endsWith("'"))) {
          candidate = candidate.slice(1, -1);
        }
        uuid = candidate;
      }
      if (!uuid) throw new HttpException('Missing required parameter: API Token', HttpStatus.BAD_REQUEST);

      // Log parameters (bankCode ยังไม่ส่งไป backend)
      console.log('📊 Transaction parameters:', {
        fromBankAccountNumber,
        fromName, 
        bankCode: bankCode || '(not specified)'
      });

      // เรียก backend API ด้วย uuid (ไม่ใช้ JWT แล้ว)
      const result = await this.transactionsService.processGetTransactions({
        fromBankAccountNumber,
        fromName
      }, uuid);
      
      return result
    } catch (error) {
      console.error('Get transactions error:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
