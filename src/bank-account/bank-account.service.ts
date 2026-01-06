import { HttpException, Injectable } from "@nestjs/common";
import { getTargetDomainAndTokenByUuid } from "../lib/token-utils";

@Injectable()
export class BankAccountService {
  constructor() {}

  // เลิกใช้ JWT ตรวจสอบแล้ว

  async getBankAccounts(uuid: string) {
    try {
      // ดึง targetDomain และ tokenHash จาก DB ด้วย UUID
      const resolved = await getTargetDomainAndTokenByUuid(uuid);
      if (!resolved) {
        throw new HttpException(
          "Invalid API Token: token not found or inactive",
          400
        );
      }
      const { targetDomain: backendUrl, tokenHash } = resolved;

      // เรียก backend bank-account API (ส่ง uuid ผ่าน Authorization header)
      const fullUrl = `${backendUrl}/api/bank-account`;

      //console.log('🌐 Backend URL from API Token:', backendUrl);
      //console.log('🔗 Full URL:', fullUrl);
      //console.log('🔑 Forwarding API Token in Authorization header');

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // ส่ง uuid ผ่าน Authorization header ตามที่ร้องขอ
          Authorization: `Bearer ${uuid}`,
        },
      });

      if (!response.ok) {
        let errorMessage = "Backend API error";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // หาก response ไม่ใช่ JSON (เช่น HTML error page)
          const textResponse = await response.text();
          console.error(
            "❌ Backend returned non-JSON response:",
            textResponse.substring(0, 200)
          );
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
        console.error(
          "❌ Backend returned non-JSON success response:",
          textResponse.substring(0, 200)
        );
        throw new HttpException(
          "Backend returned invalid response format",
          500
        );
      }

      // บันทึก log (console.log แทน database)
      // console.log('Bank Accounts Log:', {
      // targetDomain: backendUrl,
      // endpoint: '/api/bank-account',
      // method: 'GET',
      // responseBody: JSON.stringify(result),
      // statusCode: response.status,
      // isSuccess: response.ok
      // });

      return result;
    } catch (error) {
      console.error("Process bank accounts error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        cause: error.cause,
      });

      // บันทึก error log (console.log แทน database)
      console.log("Bank Accounts Error Log:", {
        targetDomain: "unknown",
        endpoint: "/api/bank-account",
        method: "GET",
        responseBody: JSON.stringify({ error: error.message }),
        statusCode: error.status || 500,
        isSuccess: false,
      });

      throw error;
    }
  }
}
