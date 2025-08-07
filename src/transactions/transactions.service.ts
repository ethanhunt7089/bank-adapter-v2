import { HttpException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TransactionsService {
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

  async processGetTransactions(queryData: {
    fromBankAccountNumber?: string;
    fromName?: string;
    fromDate?: string;
  }, token: string) {
    try {
      // ตรวจสอบ token และดึง target_domain
      const payload = this.jwtService.verify(token);
      const backendUrl = payload.target_domain;
      
      if (!backendUrl) {
        throw new HttpException('Invalid token: missing target_domain', 401);
      }

      // สร้าง query string
      const queryParams = new URLSearchParams();
      if (queryData.fromBankAccountNumber) {
        queryParams.append('fromBankAccountNumber', queryData.fromBankAccountNumber);
      }
      if (queryData.fromName) {
        queryParams.append('fromName', queryData.fromName);
      }
      if (queryData.fromDate) {
        queryParams.append('fromDate', queryData.fromDate);
      }

      // เรียก backend API
      const fullUrl = `${backendUrl}/api/transactions?${queryParams.toString()}`;
      
      console.log('🌐 Backend URL from token:', backendUrl);
      console.log('🔗 Full URL:', fullUrl);
      console.log('🔑 Using token:', token);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
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
      console.log('Transaction Log:', {
        targetDomain: backendUrl,
        endpoint: '/api/transactions',
        method: 'GET',
        requestQuery: queryParams.toString(),
        responseBody: JSON.stringify(result),
        statusCode: response.status,
        isSuccess: response.ok
      });

      return result;
    } catch (error) {
      console.error('Process get transactions error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        cause: error.cause
      });
      
      // บันทึก error log (console.log แทน database)
      console.log('Transaction Error Log:', {
        targetDomain: 'unknown',
        endpoint: '/api/transactions',
        method: 'GET',
        requestQuery: queryData,
        responseBody: JSON.stringify({ error: error.message }),
        statusCode: error.status || 500,
        isSuccess: false
      });

      throw error;
    }
  }
}
