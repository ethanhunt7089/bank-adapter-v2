import { HttpException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class BankAccountService {
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

  async getBankAccounts(token: string) {
    try {
      // ตรวจสอบ token และดึง target_domain
      const payload = this.jwtService.verify(token);
      const backendUrl = payload.target_domain;
      
      if (!backendUrl) {
        throw new HttpException('Invalid token: missing target_domain', 401);
      }

      // เรียก backend bank-account API
      const fullUrl = `${backendUrl}/api/bank-account`;
      
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
        let errorMessage = 'Backend API error';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // หาก response ไม่ใช่ JSON (เช่น HTML error page)
          const textResponse = await response.text();
          console.error('❌ Backend returned non-JSON response:', textResponse.substring(0, 200));
          errorMessage = `Backend server error (Status: ${response.status})`;
        }
        
        throw new HttpException(errorMessage, response.status);
      }

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        // หาก success response ไม่ใช่ JSON
        const textResponse = await response.text();
        console.error('❌ Backend returned non-JSON success response:', textResponse.substring(0, 200));
        throw new HttpException('Backend returned invalid response format', 500);
      }
      
      // บันทึก log (console.log แทน database)
      console.log('Bank Accounts Log:', {
        targetDomain: backendUrl,
        endpoint: '/api/bank-account',
        method: 'GET',
        responseBody: JSON.stringify(result),
        statusCode: response.status,
        isSuccess: response.ok
      });

      return result;
    } catch (error) {
      console.error('Process bank accounts error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        cause: error.cause
      });
      
      // บันทึก error log (console.log แทน database)
      console.log('Bank Accounts Error Log:', {
        targetDomain: 'unknown',
        endpoint: '/api/bank-account',
        method: 'GET',
        responseBody: JSON.stringify({ error: error.message }),
        statusCode: error.status || 500,
        isSuccess: false
      });

      throw error;
    }
  }
}
