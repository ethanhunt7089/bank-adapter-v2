import { Body, Controller, Headers, HttpException, HttpStatus, Post } from '@nestjs/common';
import { WithdrawService } from './withdraw.service';

interface WithdrawRequest {
  accountNumber: string;
  amount: number;
}

@Controller()
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) {}

  @Post('withdraw')
  async withdraw(
    @Headers('authorization') authorization: string,
    @Body() withdrawRequest: WithdrawRequest
  ) {
    try {
      // ตรวจสอบ token
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
