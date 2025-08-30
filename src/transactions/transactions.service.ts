import { HttpException, Injectable } from "@nestjs/common";
import { prisma } from "../lib/prisma";
import { getTargetDomainAndTokenByUuid } from "../lib/token-utils";

@Injectable()
export class TransactionsService {
  constructor() {}

  // เลิกใช้ JWT ตรวจสอบแล้ว

  async processGetTransactions(
    queryData: {
      fromBankAccountNumber?: string;
      fromName?: string;
    },
    uuid: string
  ) {
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

      // อ่าน cursor ต่อ API Token
      const cursor = await prisma.transactionCursor
        .findFirst({ where: { tokenUuid: uuid } })
        .catch(() => null);

      // คำนวณ fromDate: ครั้งแรก → '0', ถัดไป → lastSeenAt (LA time, +1s) ฟอร์แมต 'YYYY-MM-DD HH:mm:ss'
      const toLaosTime = (d: Date) =>
        new Date(d.getTime() + 7 * 60 * 60 * 1000);
      const plusOneSecond = (d: Date) => new Date(d.getTime() + 1000);
      const formatDateTime = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, "0");
        const yyyy = d.getFullYear();
        const MM = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const HH = pad(d.getHours());
        const mm = pad(d.getMinutes());
        const ss = pad(d.getSeconds());
        return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
      };

      const computedFromDate = cursor
        ? plusOneSecond(new Date(cursor.lastSeenAt))
        : null;
      const fromDateParam = computedFromDate
        ? formatDateTime(toLaosTime(computedFromDate))
        : "0";

      const queryParams = new URLSearchParams();
      // ส่งครบทุกพารามิเตอร์ตามข้อกำหนดของ upstream
      queryParams.append(
        "fromBankAccountNumber",
        queryData.fromBankAccountNumber ?? ""
      );
      queryParams.append("fromName", queryData.fromName ?? "");
      queryParams.append("fromDate", fromDateParam);
      // หมายเหตุ: ไม่รับ fromDate จากผู้ใช้แล้ว ส่วนนี้ถูกคำนวณเองด้านบน

      // เรียก backend API
      const fullUrl = `${backendUrl}/api/transactions?${queryParams.toString()}`;

      console.log("🌐 Backend URL from API Token:", backendUrl);
      console.log("🔗 Full URL:", fullUrl);
      console.log("🔑 Forwarding API Token in Authorization header");
      console.log(
        "🕒 Using fromDate (LA +1s):",
        fromDateParam,
        "| cursor:",
        cursor?.lastSeenAt ?? "none"
      );

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // ส่ง uuid ผ่าน Authorization header ตามที่ร้องขอ
          Authorization: `Bearer ${uuid}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new HttpException(
          errorData.error || "Backend API error",
          response.status
        );
      }

      const result: any = await response.json();

      result.data = (result.data ?? []).map((tx: any) => ({
        creditType: tx.creditType,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        fromName: tx.fromName,
        fromBankCode: tx.fromBankCode,
        fromBankAccountNumber: tx.fromBankAccountNumber,
        toName: tx.toName,
        toBankCode: tx.toBankCode,
        toBankAccountNumber: tx.toBankAccountNumber,
        remarks: tx.remarks,
        transactionTimestamp: tx.transactionTimestampV2,
      }));

      // หาค่า transactionTimestamp ล่าสุดจาก data
      if (result.data && result.data.length > 0) {
        const latestTimestamp = result.data
          .map((tx: any) => tx.transactionTimestamp)
          .filter(Boolean) // กรองค่า null/undefined ออก
          .sort(
            (a: string, b: string) =>
              new Date(b).getTime() - new Date(a).getTime()
          )[0]; // เรียงจากใหม่ไปเก่า แล้วเอาตัวแรก

        result.transactionTimestamp = latestTimestamp;

        // Update transactionCursor ด้วยเวลาล่าสุด
        if (latestTimestamp) {
          // ใช้ findFirst และ updateMany แทน upsert เพราะมี compound unique constraint
          const existingCursor = await prisma.transactionCursor.findFirst({
            where: { tokenUuid: uuid },
          });

          if (existingCursor) {
            await prisma.transactionCursor.update({
              where: { id: existingCursor.id },
              data: { lastSeenAt: new Date(latestTimestamp) },
            });
          } else {
            await prisma.transactionCursor.create({
              data: {
                tokenUuid: uuid,
                lastSeenAt: new Date(latestTimestamp),
                from_bank_account_number: queryData.fromBankAccountNumber ?? "",
              },
            });
          }
        }
      }

      // ส่งคืนเฉพาะข้อมูลธุรกรรมที่ผ่านการ map แล้วเท่านั้น
      return result;
    } catch (error) {
      console.error("Process get transactions error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        cause: error.cause,
      });

      // บันทึก error log (console.log แทน database)
      console.log("Transaction Error Log:", {
        targetDomain: "unknown",
        endpoint: "/api/transactions",
        method: "GET",
        requestQuery: queryData,
        responseBody: JSON.stringify({ error: error.message }),
        statusCode: error.status || 500,
        isSuccess: false,
      });

      throw error;
    }
  }
}
