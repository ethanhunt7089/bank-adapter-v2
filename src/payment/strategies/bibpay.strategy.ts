import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { PrismaService } from "../../lib/prisma.service";
import {
  IPaymentGateway,
  CreateDepositPayload,
  CreateWithdrawPayload,
  DepositResponse,
  WithdrawResponse,
  WebhookData,
  GatewayType,
} from "../interfaces/payment-gateway.interface";

@Injectable()
export class BibPayStrategy implements IPaymentGateway {
  private readonly logger = new Logger(BibPayStrategy.name);
  private readonly baseUrl = "https://bibpay-api-wahja.ondigitalocean.app";
  private readonly balanceUrl = "https://api.bibbyx.com";

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {}

  // ใช้ keys จาก PaymentKey ที่ส่งมา
  private getApiKey(paymentKey: any): string {
    return paymentKey.paymentKey;
  }

  private getSecretKey(paymentKey: any): string {
    return paymentKey.paymentSecret;
  }

  // ตรวจสอบ bank code ว่ามีใน BibPay หรือไม่
  private async validateBankCodeForBibPay(bankCode: string): Promise<string> {
    try {
      this.logger.log(`=== BibPay Bank Code Validation ===`);
      this.logger.log(
        `Input bankCode: "${bankCode}" (type: ${typeof bankCode})`
      );

      // หาข้อมูล bank จาก bank_info table
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

      if (bankInfo) {
        this.logger.log(
          `✅ Bank code validated: ${bankCode} is supported by BibPay`
        );
        return bankCode; // ใช้ bankCode เดิม
      }

      // ถ้าไม่เจอ ให้ throw error
      this.logger.error(`❌ No bank found in database: ${bankCode}`);
      this.logger.log(`=== End BibPay Bank Code Validation ===`);
      throw new Error(`Bank code ${bankCode} is not supported by BibPay`);
    } catch (error) {
      this.logger.error(
        `❌ Error validating bank code ${bankCode}:`,
        error.message
      );
      throw error;
    }
  }

  async createDeposit(
    payload: CreateDepositPayload,
    token: any
  ): Promise<DepositResponse> {
    try {
      // 1. ดึงข้อมูล PaymentKey
      const paymentKey = await this.prisma.paymentKey.findFirst({
        where: {
          token: token.uuid,
          paymentSys: "bibpay",
        },
      });

      if (!paymentKey) {
        return {
          success: false,
          message: "PaymentKey not found for BibPay",
        };
      }

      // 2. ตรวจสอบ bank code ก่อน
      const bibpayBankCode = await this.validateBankCodeForBibPay(
        payload.bankCode
      );

      const bibpayPayload = {
        bankName: payload.accountName, // เปลี่ยนจาก accountName เป็น bankName
        bankNumber: payload.bankNumber,
        bankCode: bibpayBankCode, // ใช้ BibPay bank code
        callbackUrl: "https://central-dragon-11.com/bcel-api/webhooks/bibpay", // Hardcode callbackUrl
        refferend: payload.refCode, // เปลี่ยนจาก refCode เป็น refferend
        amount: payload.amount, // ✅ ใช้ number แทน string
      };

      // 3. สร้าง signature สำหรับ BIB-Pay
      const signature = this.generateSignature(bibpayPayload, paymentKey);

      // เพิ่ม signature เข้าไปใน payload
      (bibpayPayload as any).signatrure = signature;

      // Log ข้อมูลที่ส่งไป BIB-Pay API
      console.log(`=== Sending to BIB-Pay API (Deposit) ===`);
      console.log(`URL: ${this.baseUrl}/api/v1/mc/payin`);
      console.log(`Payload:`, JSON.stringify(bibpayPayload, null, 2));
      console.log(`Headers:`, {
        "x-api-key": this.getApiKey(paymentKey),
        "Content-Type": "application/json",
      });
      console.log(`Signature: ${signature}`);
      console.log(`================================`);

      const response = await axios.post(
        `${this.baseUrl}/api/v1/mc/payin`,
        bibpayPayload,
        {
          headers: {
            "x-api-key": this.getApiKey(paymentKey),
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = response.data;

      // Log response จาก BibPay
      console.log(`=== BibPay API Response ===`);
      console.log(`Status: ${response.status}`);
      console.log(`Response:`, JSON.stringify(responseData, null, 2));
      console.log(`========================`);

      // แก้ไขการเช็ค status - BIB-Pay ส่ง status: true
      if (responseData.status === true || responseData.status === "success") {
        // แปลง QR Code string เป็น image URL
        const qrCodeString = responseData.data?.qrcode; // ใช้ qrcode ไม่ใช่ qrCode
        const qrCodeUrl = qrCodeString
          ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeString)}`
          : undefined;

        return {
          success: true,
          qrcodeUrl: qrCodeUrl,
          message: `Deposit created successfully. Amount: ${responseData.data?.amount || payload.amount} THB. Transaction ID: ${responseData.data?.transactionId || "N/A"}`,
          paymentTrx: responseData.data?.transactionId,
          gatewayResponse: responseData,
        };
      }

      return {
        success: false,
        message: responseData.message || "Failed to create deposit",
      };
    } catch (error) {
      // Log error response จาก BIB-Pay API
      if (error.response) {
        console.log(`=== BIB-Pay API Error Response (Deposit) ===`);
        console.log(`Status: ${error.response.status}`);
        console.log(`Data:`, JSON.stringify(error.response.data, null, 2));
        console.log(`Headers:`, error.response.headers);
        console.log(`================================`);

        // ส่ง error message จาก BIB-Pay API กลับไป
        return {
          success: false,
          message:
            error.response.data?.msg ||
            error.response.data?.message ||
            "BIB-Pay API error",
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
      // 1. ดึงข้อมูล PaymentKey
      const paymentKey = await this.prisma.paymentKey.findFirst({
        where: {
          token: token.uuid,
          paymentSys: "bibpay",
        },
      });

      if (!paymentKey) {
        return {
          success: false,
          message: "PaymentKey not found for BibPay",
        };
      }

      // 2. ตรวจสอบ bank code ก่อน
      const bibpayBankCode = await this.validateBankCodeForBibPay(
        payload.bankCode
      );

      const bibpayPayload = {
        bankName: payload.accountName, // เปลี่ยนจาก accountName เป็น bankName
        bankNumber: payload.bankNumber,
        bankCode: bibpayBankCode, // ใช้ BibPay bank code
        callbackUrl: "https://central-dragon-11.com/bcel-api/webhooks/bibpay", // Hardcode callbackUrl
        refferend: payload.refCode, // เปลี่ยนจาก refCode เป็น refferend
        amount: payload.amount, // ✅ ใช้ number แทน string
      };

      // 3. สร้าง signature สำหรับ BIB-Pay
      const signature = this.generateSignature(bibpayPayload, paymentKey);

      // เพิ่ม signature เข้าไปใน payload
      (bibpayPayload as any).signatrure = signature;

      // Log ข้อมูลที่ส่งไป BIB-Pay API
      console.log(`=== Sending to BIB-Pay API (Withdraw) ===`);
      console.log(`URL: ${this.baseUrl}/api/v1/mc/payout`);
      console.log(`Payload:`, JSON.stringify(bibpayPayload, null, 2));
      console.log(`Headers:`, {
        "x-api-key": this.getApiKey(paymentKey),
        "Content-Type": "application/json",
      });
      console.log(`Signature: ${signature}`);
      console.log(`================================`);

      const response = await axios.post(
        `${this.baseUrl}/api/v1/mc/payout`,
        bibpayPayload,
        {
          headers: {
            "x-api-key": this.getApiKey(paymentKey),
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = response.data;

      // แก้ไขการเช็ค status - BIB-Pay ส่ง status: true
      if (responseData.status === true || responseData.status === "success") {
        return {
          success: true,
          message: `Withdraw created successfully. Amount: ${responseData.data?.amount || payload.amount} THB. Transaction ID: ${responseData.data?.transactionId || "N/A"}`,
          paymentTrx: responseData.data?.transactionId,
          gatewayResponse: responseData,
        };
      }

      return {
        success: false,
        message: responseData.message || "Failed to create withdraw",
      };
    } catch (error) {
      // Log error response จาก BIB-Pay API
      if (error.response) {
        console.log(`=== BIB-Pay API Error Response (Withdraw) ===`);
        console.log(`Status: ${error.response.status}`);
        console.log(`Data:`, JSON.stringify(error.response.data, null, 2));
        console.log(`Headers:`, error.response.headers);
        console.log(`================================`);

        // ส่ง error message จาก BIB-Pay API กลับไป
        return {
          success: false,
          message:
            error.response.data?.msg ||
            error.response.data?.message ||
            error.message,
        };
      }

      return {
        success: false,
        message: error.message || "Internal server error",
      };
    }
  }

  async handleWebhook(webhookData: WebhookData): Promise<void> {
    // BIB-Pay webhook handling logic
    // This will be implemented based on the webhook data structure
    console.log("BIB-Pay webhook received:", webhookData);
  }

  getGatewayType(): GatewayType {
    return GatewayType.BIBPAY;
  }

  private generateSignature(payload: any, paymentKey: any): string {
    const jwt = require("jsonwebtoken");
    const secret = this.getSecretKey(paymentKey);
    const jwtToken = jwt.sign(payload, secret);
    return jwtToken;
  }

  async getBalance(token: any): Promise<any> {
    try {
      // ดึงข้อมูล PaymentKey
      const paymentKey = await this.prisma.paymentKey.findFirst({
        where: {
          token: token.uuid,
          paymentSys: "bibpay",
        },
      });

      if (!paymentKey) {
        return {
          success: false,
          message: "PaymentKey not found for BibPay",
        };
      }

      const response = await axios.post(
        `${this.balanceUrl}/api/v1/mc/balance`,
        {},
        {
          headers: {
            "x-api-key": this.getApiKey(paymentKey),
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = response.data;

      if (responseData.status === true || responseData.status === "success") {
        return {
          success: true,
          balance: responseData.data?.balance || 0,
        };
      }

      return {
        success: false,
        balance: 0,
        message: responseData.message || "Failed to get balance",
      };
    } catch (error) {
      return {
        success: false,
        balance: 0,
        message: error.message || "Internal server error",
      };
    }
  }
}
