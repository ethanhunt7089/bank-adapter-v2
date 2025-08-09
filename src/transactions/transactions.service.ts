import { HttpException, Injectable } from '@nestjs/common';
import { prisma } from '../lib/prisma';
import { getTargetDomainAndTokenByUuid } from '../lib/token-utils';

@Injectable()
export class TransactionsService {
  constructor() {}

  // เลิกใช้ JWT ตรวจสอบแล้ว

  async processGetTransactions(queryData: {
    fromBankAccountNumber?: string;
    fromName?: string;
  }, uuid: string) {
    try {
      // ดึง targetDomain และ tokenHash จาก DB ด้วย UUID
      const resolved = await getTargetDomainAndTokenByUuid(uuid);
      if (!resolved) {
        throw new HttpException('Invalid API Token: token not found or inactive', 400);
      }
      const { targetDomain: backendUrl, tokenHash } = resolved;

      // อ่าน cursor ต่อ API Token
      const cursor = await prisma.transactionCursor.findUnique({ where: { tokenUuid: uuid } }).catch(() => null);

      // คำนวณ fromDate: ถ้าไม่มี cursor → '0' (ดึงทั้งหมด), ถ้ามี → format 'YYYY-MM-DD HH:mm:ss'
      const computedFromDate = cursor
        ? new Date(cursor.lastSeenAt)
        : null;

      const formatDateTime = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const HH = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
      };

      const queryParams = new URLSearchParams();
      if (queryData.fromBankAccountNumber) queryParams.append('fromBankAccountNumber', queryData.fromBankAccountNumber);
      if (queryData.fromName) queryParams.append('fromName', queryData.fromName);
      queryParams.append('fromDate', computedFromDate ? formatDateTime(computedFromDate) : '0');
      // หมายเหตุ: ไม่รับ fromDate จากผู้ใช้แล้ว ส่วนนี้ถูกคำนวณเองด้านบน

      // เรียก backend API
      const fullUrl = `${backendUrl}/api/transactions?${queryParams.toString()}`;
      
      console.log('🌐 Backend URL from API Token:', backendUrl);
      console.log('🔗 Full URL:', fullUrl);
      console.log('🔑 Forwarding API Token in Authorization header');
      console.log('🕒 Using fromDate:', queryParams.get('fromDate'));
      
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

         // อัปเดต cursor ด้วยเวลาล่าสุด หากมีข้อมูล
         const latest = result.data.transactions
           .map((t: any) => new Date(t.transactionTimestamp))
           .filter((d: Date) => !isNaN(d.getTime()))
           .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];

         if (latest) {
           await prisma.transactionCursor.upsert({
             where: { tokenUuid: uuid },
             update: { lastSeenAt: latest },
             create: { tokenUuid: uuid, lastSeenAt: latest }
           });
           console.log('💾 Updated transaction cursor:', latest.toISOString());
         }
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
