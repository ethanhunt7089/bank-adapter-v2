import { HttpException, Injectable } from '@nestjs/common';
import { getTargetDomainAndTokenByUuid } from '../lib/token-utils';

@Injectable()
export class TransactionsService {
  constructor() {}

  // เลิกใช้ JWT ตรวจสอบแล้ว

  async processGetTransactions(queryData: {
    fromBankAccountNumber?: string;
    fromName?: string;
    fromDate?: string;
  }, uuid: string) {
    try {
      // ดึง targetDomain และ tokenHash จาก DB ด้วย UUID
      const resolved = await getTargetDomainAndTokenByUuid(uuid);
      if (!resolved) {
        throw new HttpException('Invalid uuid: token not found or inactive', 400);
      }
      const { targetDomain: backendUrl, tokenHash } = resolved;

      // สร้าง query string (ไม่ส่ง uuid ใน query อีกต่อไป)
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
      
      console.log('🌐 Backend URL from uuid:', backendUrl);
      console.log('🔗 Full URL:', fullUrl);
      console.log('🔑 Forwarding uuid in Authorization header');
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // ส่ง uuid ผ่าน Authorization header ตามที่ร้องขอ
          'Authorization': `Bearer ${uuid}`
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
       
       
       // Filter response to show only specific fields
       if (result.data && result.data.transactions && Array.isArray(result.data.transactions)) {
         result.data.transactions = result.data.transactions.map(transaction => ({
           creditType: transaction.creditType,
           amount: transaction.amount,
           currency: transaction.currency,
           status: transaction.status,
           fromName: transaction.fromName,
           fromBankCode: transaction.fromBankCode,
           fromBankAccountNumber: transaction.fromBankAccountNumber,
           toName: transaction.toName,
           toBankCode: transaction.toBankCode,
           toBankAccountNumber: transaction.toBankAccountNumber,
           remarks: transaction.remarks,
           transactionTimestamp: transaction.transferDateTimeV2
         }));
       }
       

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
