import { Body, Controller, HttpException, HttpStatus, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WithdrawService } from './withdraw.service';

interface WithdrawRequest {
  accountNumber: string;
  amount: number;
}

@ApiTags('Banking')
@Controller()
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) {}

  @Post('withdraw')
  @ApiOperation({ 
    summary: 'Process withdrawal request', 
    description: 'ส่งคำขอถอนเงินไปยังระบบ BCEL1 โดยระบุเลขบัญชี BCEL1 ปลายทางและจำนวนเงิน หน่วย LAK (Submit withdrawal request to BCEL1 system with target BCEL1 account number and amount in LAK currency unit)'
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        accountNumber: { 
          type: 'string', 
          description: 'BCEL1 Target Account Number - บัญชีปลายทาง BCEL1 (Format: XXX-XX-XX-XXXXXXX-XXX)',
          example: '123-45-00-1234567-001'
        },
        amount: { 
          type: 'number', 
          description: 'จำนวนเงิน หน่วย LAK (Withdrawal amount in LAK currency unit)',
          example: 50000
        }
      },
      required: ['accountNumber', 'amount'],
      example: {
        accountNumber: "123-45-00-1234567-001",
        amount: 50000
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Withdrawal processed successfully',
    content: {
      'application/json': {
        example: {
          "success": true,
          "data": {
            "success": true,
            "txnId": "clx1234567890",
            "message": "รายการถอนเงินถูกส่งไปยังระบบเรียบร้อยแล้ว",
            "status": "PENDING",
            "amount": 50000,
            "currency": "LAK",
            "transferDateTimeV2": "2025-08-06T10:30:00.000Z"
          }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request data',
    content: {
      'application/json': {
        example: {
          "statusCode": 400,
          "message": "Missing required fields: accountNumber, amount"
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
  async withdraw(
    @Request() req: any,
    @Body() withdrawRequest: WithdrawRequest
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
      const isValidToken = await this.withdrawService.validateToken(token);
      
      if (!isValidToken) {
        throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
      }

      // ตรวจสอบ required fields
      if (!withdrawRequest.accountNumber || !withdrawRequest.amount) {
        throw new HttpException('Missing required fields: accountNumber, amount', HttpStatus.BAD_REQUEST);
      }

      // ตรวจสอบ amount เป็นตัวเลขบวก
      if (typeof withdrawRequest.amount !== 'number' || withdrawRequest.amount <= 0) {
        throw new HttpException('Amount must be a positive number', HttpStatus.BAD_REQUEST);
      }

      // เรียก backend API
      const result = await this.withdrawService.processWithdraw(withdrawRequest, token);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Withdraw error:', error);
      throw new HttpException(
        error.message || 'Internal server error',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
