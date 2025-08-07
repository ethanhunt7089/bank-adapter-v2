import { Controller, Get, Headers, HttpException, HttpStatus, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('transactions')
  async getTransactions(
    @Headers('authorization') authorization: string,
    @Query('fromBankAccountNumber') fromBankAccountNumber?: string,
    @Query('fromName') fromName?: string,
    @Query('fromDate') fromDate?: string
  ) {
    try {
      // ตรวจสอบ token
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
