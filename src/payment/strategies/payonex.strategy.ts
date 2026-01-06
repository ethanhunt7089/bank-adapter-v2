import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import {
  IPaymentGateway,
  CreateDepositPayload,
  CreateWithdrawPayload,
  DepositResponse,
  WithdrawResponse,
  WebhookData,
  GatewayType,
} from "../interfaces/payment-gateway.interface";
import { PrismaService } from "../../lib/prisma.service";

@Injectable()
export class PayOneXStrategy implements IPaymentGateway {
  private readonly logger = new Logger(PayOneXStrategy.name);
  private readonly baseUrl = "https://api.payonex.asia";

  constructor(private readonly prisma: PrismaService) {}

  // ดึง credentials จาก PaymentKey
  private getAccessKey(paymentKey: any): string {
    return paymentKey.paymentAccess;
  }

  private getSecretKey(paymentKey: any): string {
    return paymentKey.paymentSecret;
  }

  private getAuthToken(paymentKey: any): string {
    return paymentKey.paymentKey;
  }

  // สร้าง authentication token
  private async authenticate(paymentKey: any): Promise<string | null> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/authenticate`,
        {
          accessKey: this.getAccessKey(paymentKey),
          secretKey: this.getSecretKey(paymentKey),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (response.data.success && response.data.data?.token) {
        // อัพเดต paymentKey ใน database ด้วย token ใหม่
        await this.prisma.paymentKey.update({
          where: { id: paymentKey.id },
          data: { paymentKey: response.data.data.token },
        });

        return response.data.data.token;
      }

      this.logger.error("PayOneX authentication failed:", response.data);
      return null;
    } catch (error) {
      this.logger.error(
        "PayOneX authentication error:",
        error.response?.data || error.message
      );
      return null;
    }
  }

  // แปลง bank code จากตัวเลขเป็น PayOneX format
  private async convertBankCodeToPayOneX(bankCode: string): Promise<string> {
    try {
      this.logger.log(`=== Bank Code Conversion Debug ===`);
      this.logger.log(
        `Input bankCode: "${bankCode}" (type: ${typeof bankCode})`
      );

      // ตรวจสอบว่าเป็นตัวเลขหรือตัวอักษร
      const isNumeric = /^\d+$/.test(bankCode);

      if (isNumeric) {
        // ถ้าเป็นตัวเลข (004) → หาจาก bankCode และแปลงเป็น payonexCode
        const bankInfo = await this.prisma.bankInfo.findFirst({
          where: {
            bankCode: bankCode,
          },
        });

        this.logger.log(
          `Found bankInfo:`,
          bankInfo
            ? {
                id: bankInfo.id,
                bankName: bankInfo.bankName,
                bankCode: bankInfo.bankCode,
                centralCode: bankInfo.centralCode,
                bibCode: bankInfo.bibCode,
                payonexCode: bankInfo.payonexCode,
              }
            : "null"
        );

        if (bankInfo && bankInfo.payonexCode) {
          this.logger.log(
            `✅ Bank code converted: ${bankCode} → ${bankInfo.payonexCode}`
          );
          return bankInfo.payonexCode;
        }
      } else {
        // ถ้าเป็นตัวอักษร (KBANK) → หาจาก payonexCode และใช้เดิม
        const bankInfo = await this.prisma.bankInfo.findFirst({
          where: {
            payonexCode: bankCode,
          },
        });

        this.logger.log(
          `Found bankInfo:`,
          bankInfo
            ? {
                id: bankInfo.id,
                bankName: bankInfo.bankName,
                bankCode: bankInfo.bankCode,
                centralCode: bankInfo.centralCode,
                bibCode: bankInfo.bibCode,
                payonexCode: bankInfo.payonexCode,
              }
            : "null"
        );

        if (bankInfo) {
          this.logger.log(
            `✅ Bank code validated: ${bankCode} is supported by PayOneX`
          );
          return bankCode; // ใช้เดิม
        }
      }

      // ถ้าไม่เจอ ให้ throw error
      this.logger.error(`❌ No PayOneX code found for bank: ${bankCode}`);
      this.logger.log(`=== End Bank Code Conversion Debug ===`);
      throw new Error(`Bank code ${bankCode} is not supported by PayOneX`);
    } catch (error) {
      this.logger.error(
        `❌ Error converting bank code ${bankCode}:`,
        error.message
      );
      return bankCode; // fallback to original
    }
  }

  // จัดการ customer - สร้างใหม่หรือดึงที่มีอยู่
  private async getOrCreateCustomer(
    payload: CreateDepositPayload | CreateWithdrawPayload,
    authToken: string
  ): Promise<string | null> {
    try {
      // แปลง bank code เป็น PayOneX format
      const payonexBankCode = await this.convertBankCodeToPayOneX(
        payload.bankCode
      );

      // เช็คว่ามี customer อยู่แล้วหรือไม่
      const existingCustomer = await this.prisma.payonexCustomer.findUnique({
        where: {
          unique_payonex_customer: {
            accountName: payload.accountName,
            bankNumber: payload.bankNumber,
            bankCode: payonexBankCode, // ใช้ PayOneX bank code
          },
        },
      });

      if (existingCustomer) {
        return existingCustomer.customerId;
      }

      // สร้าง customer ใหม่
      const response = await axios.post(
        `${this.baseUrl}/v2/customers`,
        {
          name: payload.accountName,
          bankCode: payonexBankCode, // ใช้ PayOneX bank code
          accountNo: payload.bankNumber,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: authToken,
          },
        }
      );

      if (response.data.success && response.data.data?.customerUuid) {
        const customerUuid = response.data.data.customerUuid;

        // บันทึกลง database
        await this.prisma.payonexCustomer.create({
          data: {
            customerId: customerUuid,
            accountName: payload.accountName,
            bankNumber: payload.bankNumber,
            bankCode: payonexBankCode, // ใช้ PayOneX bank code
          },
        });

        return customerUuid;
      }

      this.logger.error("PayOneX create customer failed:", response.data);
      return null;
    } catch (error) {
      this.logger.error(
        "PayOneX create customer error:",
        error.response?.data || error.message
      );
      return null;
    }
  }

  async createDeposit(
    payload: CreateDepositPayload,
    token: any
  ): Promise<DepositResponse> {
    try {
      this.logger.log(`Creating PayOneX deposit with ref: ${payload.refCode}`);

      // 1. ดึงข้อมูล PaymentKey
      const paymentKey = await this.prisma.paymentKey.findFirst({
        where: {
          token: token.uuid,
          paymentSys: "payonex",
        },
      });

      if (!paymentKey) {
        return {
          success: false,
          message: "PaymentKey not found for PayOneX",
        };
      }

      // 2. Authenticate
      const authToken = await this.authenticate(paymentKey);
      if (!authToken) {
        return {
          success: false,
          message: "PayOneX authentication failed",
        };
      }

      // 2. Get or create customer
      const customerUuid = await this.getOrCreateCustomer(payload, authToken);
      if (!customerUuid) {
        return {
          success: false,
          message: "Failed to create/get PayOneX customer",
        };
      }

      // 3. Create deposit request
      const payonexPayload = {
        customerUuid: customerUuid,
        amount: payload.amount.toString(),
        referenceId: payload.refCode,
        note: "Deposit request",
        remark: `Deposit for ${payload.accountName}`,
      };

      this.logger.log(`=== Sending to PayOneX API (Deposit) ===`);
      this.logger.log(`URL: ${this.baseUrl}/transactions/deposit/request`);
      this.logger.log(`Payload:`, JSON.stringify(payonexPayload, null, 2));
      this.logger.log(`Authorization: ${authToken}`);
      this.logger.log(`================================`);

      const response = await axios.post(
        `${this.baseUrl}/transactions/deposit/request`,
        payonexPayload,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: authToken,
          },
        }
      );

      const responseData = response.data;

      if (responseData.success) {
        // แปลง QR Code string เป็น image URL
        const qrCodeString = responseData.data?.qrCode;
        const qrCodeUrl = qrCodeString
          ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeString)}`
          : undefined;

        return {
          success: true,
          qrcodeUrl: qrCodeUrl,
          message: `PayOneX deposit created successfully. Amount: ${responseData.data?.amount || payload.amount} THB. Transaction ID: ${responseData.data?.uuid || "N/A"}`,
          paymentTrx: responseData.data?.uuid,
          gatewayResponse: responseData,
        };
      }

      return {
        success: false,
        message: responseData.message || "Failed to create PayOneX deposit",
      };
    } catch (error) {
      if (error.response) {
        this.logger.error(`=== PayOneX API Error Response (Deposit) ===`);
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(
          `Data:`,
          JSON.stringify(error.response.data, null, 2)
        );
        this.logger.error(`================================`);

        return {
          success: false,
          message: error.response.data?.message || "PayOneX API error",
        };
      }

      return {
        success: false,
        message: "Internal server error",
      };
    }
  }

  async createWithdraw(
    payload: CreateWithdrawPayload,
    token: any
  ): Promise<WithdrawResponse> {
    try {
      this.logger.log(`Creating PayOneX withdraw with ref: ${payload.refCode}`);

      // 1. ดึงข้อมูล PaymentKey
      const paymentKey = await this.prisma.paymentKey.findFirst({
        where: {
          token: token.uuid,
          paymentSys: "payonex",
        },
      });

      if (!paymentKey) {
        return {
          success: false,
          message: "PaymentKey not found for PayOneX",
        };
      }

      // 2. Authenticate
      const authToken = await this.authenticate(paymentKey);
      if (!authToken) {
        return {
          success: false,
          message: "PayOneX authentication failed",
        };
      }

      // 2. Get or create customer
      const customerUuid = await this.getOrCreateCustomer(payload, authToken);
      if (!customerUuid) {
        return {
          success: false,
          message: "Failed to create/get PayOneX customer",
        };
      }

      // 3. Create withdraw request
      const payonexPayload = {
        customerUuid: customerUuid,
        amount: payload.amount.toString(),
        referenceId: payload.refCode,
        note: "Withdraw request",
        remark: `Withdraw for ${payload.accountName}`,
      };

      this.logger.log(`=== PayOneX Withdraw Request Details ===`);
      this.logger.log(`Original Input:`);
      this.logger.log(`- refCode: ${payload.refCode}`);
      this.logger.log(`- amount: ${payload.amount}`);
      this.logger.log(`- accountName: ${payload.accountName}`);
      this.logger.log(`- bankNumber: ${payload.bankNumber}`);
      this.logger.log(`- bankCode: ${payload.bankCode}`);
      this.logger.log(`- callbackUrl: ${payload.callbackUrl}`);
      this.logger.log(``);
      this.logger.log(`PayOneX API Request:`);
      this.logger.log(`- URL: ${this.baseUrl}/transactions/withdraw/request`);
      this.logger.log(`- Method: POST`);
      this.logger.log(`- Headers:`);
      this.logger.log(`  - Content-Type: application/json`);
      this.logger.log(`  - Accept: application/json`);
      this.logger.log(`  - Authorization: ${authToken}`);
      this.logger.log(`- Body:`, JSON.stringify(payonexPayload, null, 2));
      this.logger.log(`================================`);

      const response = await axios.post(
        `${this.baseUrl}/transactions/withdraw/request`,
        payonexPayload,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: authToken,
          },
        }
      );

      const responseData = response.data;

      this.logger.log(`=== PayOneX API Response (Withdraw) ===`);
      this.logger.log(`Status: ${response.status}`);
      this.logger.log(`Response:`, JSON.stringify(responseData, null, 2));
      this.logger.log(`================================`);

      if (responseData.success) {
        return {
          success: true,
          message: `PayOneX withdraw created successfully. Amount: ${payload.amount} THB. Reference: ${payload.refCode}`,
          paymentTrx: responseData.data?.transactionId || payload.refCode,
          gatewayResponse: responseData,
          refCode: payload.refCode,
        };
      }

      return {
        success: false,
        message: responseData.message || "Failed to create PayOneX withdraw",
      };
    } catch (error) {
      if (error.response) {
        this.logger.error(`=== PayOneX API Error Response (Withdraw) ===`);
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(
          `Data:`,
          JSON.stringify(error.response.data, null, 2)
        );
        this.logger.error(`================================`);

        return {
          success: false,
          message: error.response.data?.message || "PayOneX API error",
        };
      }

      return {
        success: false,
        message: "Internal server error",
      };
    }
  }

  async handleWebhook(webhookData: WebhookData): Promise<void> {
    // PayOneX webhook handling logic
    this.logger.log("PayOneX webhook received:", webhookData);

    try {
      const { refCode, transactionType, data } = webhookData;
      const status = data.status;

      this.logger.log(
        `Processing PayOneX webhook for ${refCode}, status: ${status}`
      );

      if (transactionType === "deposit") {
        // อัพเดต deposit status
        const updateData: any = {
          status: status === "SUCCESS" ? "completed" : "fail",
          gateway_response: data,
          updated_at: new Date(),
        };

        if (status === "SUCCESS") {
          updateData.completed_at = new Date();
        }

        await this.prisma.payment_deposits.updateMany({
          where: { ref_code: refCode },
          data: updateData,
        });

        this.logger.log(
          `✅ Updated deposit ${refCode} to ${updateData.status}`
        );
      } else if (transactionType === "withdraw") {
        // อัพเดต withdraw status
        const updateData: any = {
          status: status === "SUCCESS" ? "completed" : "fail",
          gateway_response: data,
          updated_at: new Date(),
        };

        if (status === "SUCCESS") {
          updateData.completed_at = new Date();
        }

        await this.prisma.payment_withdraw.updateMany({
          where: { ref_code: refCode },
          data: updateData,
        });

        this.logger.log(
          `✅ Updated withdraw ${refCode} to ${updateData.status}`
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Error processing PayOneX webhook: ${error.message}`
      );
      throw error;
    }
  }

  getGatewayType(): GatewayType {
    return GatewayType.PAYONEX;
  }

  async getBalance(token: any): Promise<any> {
    try {
      // ดึงข้อมูล PaymentKey
      const paymentKey = await this.prisma.paymentKey.findFirst({
        where: {
          token: token.uuid,
          paymentSys: "payonex",
        },
      });

      if (!paymentKey) {
        return {
          success: false,
          message: "PaymentKey not found for PayOneX",
        };
      }

      const authToken = await this.authenticate(paymentKey);
      if (!authToken) {
        return {
          success: false,
          balance: 0,
          message: "PayOneX authentication failed",
        };
      }

      const response = await axios.get(`${this.baseUrl}/profile/balance`, {
        headers: {
          Accept: "application/json",
          Authorization: authToken,
        },
      });

      const responseData = response.data;

      if (responseData.success) {
        return {
          success: true,
          balance: parseFloat(responseData.data?.balance || "0"),
          settleBalance: parseFloat(responseData.data?.settleBalance || "0"),
        };
      }

      return {
        success: false,
        balance: 0,
        message: responseData.message || "Failed to get PayOneX balance",
      };
    } catch (error) {
      this.logger.error(
        "PayOneX get balance error:",
        error.response?.data || error.message
      );
      return {
        success: false,
        balance: 0,
        message: error.message || "Internal server error",
      };
    }
  }
}
