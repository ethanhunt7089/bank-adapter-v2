import { HttpException, Injectable } from "@nestjs/common";
import { prisma } from "../lib/prisma";
import { getTargetDomainAndTokenByUuid } from "../lib/token-utils";

@Injectable()
export class TransactionsService {
  constructor() {}

  // เลิกใช้ JWT ตรวจสอบแล้ว

  async processGetTransactions(
    queryData: {
      accountNumber: string; // comma-separated
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

      // Helpers เวลาไทย (UTC+7)
      const toThailandTime = (d: Date) =>
        new Date(d.getTime() + 7 * 60 * 60 * 1000);
      const formatDateTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const pad = (n: number) => n.toString().padStart(2, "0");
        const yyyy = d.getUTCFullYear(); // ใช้ UTC
        const MM = pad(d.getUTCMonth() + 1); // ใช้ UTC
        const dd = pad(d.getUTCDate()); // ใช้ UTC
        const HH = pad(d.getUTCHours()); // ใช้ UTC
        const mm = pad(d.getUTCMinutes()); // ใช้ UTC
        const ss = pad(d.getUTCSeconds()); // ใช้ UTC
        return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
      };

      // แตกเป็นคำขอต่อบัญชี เพื่อให้ได้ข้อมูลใหม่เสมอ
      const accountList = Array.from(
        new Set(
          queryData.accountNumber
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      );

      // ดึง cursor ของทุกบัญชีเพื่อคำนวณ fromDate เป็นรายบัญชี
      const cursorsAll = accountList.length
        ? await prisma.transactionCursor
            .findMany({
              where: {
                tokenUuid: uuid,
                from_bank_account_number: { in: accountList },
              },
            })
            .catch(() => [])
        : [];
      console.log("cursorsAll: " + JSON.stringify(cursorsAll!));
      const accountToCursor = new Map<string, string>();
      for (const c of cursorsAll)
        accountToCursor.set(c.from_bank_account_number, c.lastSeenAt);

      // เรียก backend ต่อบัญชีแบบขนาน
      const perAccountResponses = await Promise.all(
        accountList.map(async (acc) => {
          const lastSeen = accountToCursor.get(acc);
          console.log(
            "lastSeenlastSeenlastSeenlastSeenlastSeenlastSeen: " + lastSeen
          );
          console.log(
            "lastSeenlastSeenlastSeenlastSeenlastSeenlastSeen: " + lastSeen
          );
          // แก้ไขตรงนี้: ไม่ต้องบวก 1 วินาที
          const fromDateParam = lastSeen ? formatDateTime(lastSeen) : "0";

          const params = new URLSearchParams();
          params.append("accountNumber", acc);
          params.append("fromDate", fromDateParam);
          const url = `${backendUrl}/api/transactions?${params.toString()}`;
          console.log("url: " + url);
          const resp = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${uuid}`,
            },
          });
          if (!resp.ok) {
            const errorData = await resp.json().catch(() => ({}));
            throw new HttpException(
              errorData.error || `Backend API error for ${acc}`,
              resp.status
            );
          }
          const json = await resp.json();
          return json;
        })
      );

      // รวมผลลัพธ์และ map ฟิลด์
      const combinedRaw = perAccountResponses.flatMap((r: any) => r.data ?? []);

      const combinedMapped = combinedRaw.map((tx: any) => ({
        id: tx.id,
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
        transactionTimestamp: tx.transferDateTimeV2,
      }));

      // คำนวณเวลาล่าสุดรวม
      const latestTimestampOverall =
        combinedMapped
          .map((tx: any) => tx.transactionTimestamp)
          .filter(Boolean)
          .sort(
            (a: string, b: string) =>
              new Date(b).getTime() - new Date(a).getTime()
          )[0] || null;

      // อัปเดต cursor ต่อบัญชีจากผลรวม
      const latestByAccount = new Map<string, string>();
      for (const tx of combinedMapped) {
        const acc = tx.toBankAccountNumber as string | undefined;
        const ts = tx.transactionTimestamp as string | undefined;
        if (!acc || !ts) continue;
        const prev = latestByAccount.get(acc);
        if (!prev || new Date(ts).getTime() > new Date(prev).getTime()) {
          latestByAccount.set(acc, ts);
        }
      }
      for (const [acc, ts] of latestByAccount) {
        await prisma.transactionCursor.upsert({
          where: {
            tokenUuid_from_bank_account_number: {
              tokenUuid: uuid,
              from_bank_account_number: acc,
            },
          },
          update: { lastSeenAt: new Date(ts) },
          create: {
            tokenUuid: uuid,
            from_bank_account_number: acc,
            lastSeenAt: new Date(ts),
          },
        });
      }

      return {
        success: true,
        transactionTimestamp: latestTimestampOverall,
        data: combinedMapped,
      };
    } catch (error) {
      console.error("Process get transactions error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        cause: error.cause,
      });

      throw error;
    }
  }

  async updateAllTransactionCursors(lastSeenAt: string, uuid: string) {
    const parsedDate = new Date(lastSeenAt);

    const result = await prisma.transactionCursor.updateMany({
      where: {
        tokenUuid: uuid,
      },
      data: {
        lastSeenAt: parsedDate,
      },
    });

    return {
      success: true,
      message: `Updated ${result.count} transaction cursors for token ${uuid}`,
      updatedCount: result.count,
    };
  }
}
