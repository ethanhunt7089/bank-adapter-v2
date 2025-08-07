import { HttpException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface WithdrawRequest {
  accountNumber: string;
  amount: number;
}

@Injectable()
export class WithdrawService {
  constructor(
    private readonly jwtService: JwtService
  ) {}

  async validateToken(token: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify(token);
      // ตรวจสอบว่า token ถูกต้อง (ไม่หมดอายุ, format ถูกต้อง)
      return !!payload;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  async processWithdraw(withdrawRequest: WithdrawRequest, token: string) {
    try {
      // ตรวจสอบ token และดึง target_domain
      const payload = this.jwtService.verify(token);
      const backendUrl = payload.target_domain;
      
      if (!backendUrl) {
        throw new HttpException('Invalid token: missing target_domain', 401);
      }

      // เรียก backend withdraw API
      const fullUrl = `${backendUrl}/api/withdraw`;
      
      console.log('🌐 Backend URL from token:', backendUrl);
      console.log('🔗 Full URL:', fullUrl);
      console.log('🔑 Using token:', token);
      console.log('💰 Withdraw request:', withdrawRequest);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(withdrawRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new HttpException(
          errorData.error || 'Backend API error',
          response.status
        );
      }

      const result = await response.json();
      
      // บันทึก log (console.log แทน database)
      console.log('Withdraw Log:', {
        targetDomain: backendUrl,
        endpoint: '/api/withdraw',
        method: 'POST',
        requestBody: JSON.stringify(withdrawRequest),
        responseBody: JSON.stringify(result),
        statusCode: response.status,
        isSuccess: response.ok
      });

      return result;
    } catch (error) {
      console.error('Process withdraw error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        cause: error.cause
      });
      
      // บันทึก error log (console.log แทน database)
      console.log('Withdraw Error Log:', {
        targetDomain: 'unknown',
        endpoint: '/api/withdraw',
        method: 'POST',
        requestBody: JSON.stringify(withdrawRequest),
        responseBody: JSON.stringify({ error: error.message }),
        statusCode: error.status || 500,
        isSuccess: false
      });

      throw error;
    }
  }
}
