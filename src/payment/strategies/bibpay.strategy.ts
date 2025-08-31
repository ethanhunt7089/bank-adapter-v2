import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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

@Injectable()
export class BibPayStrategy implements IPaymentGateway {
  private readonly baseUrl = "https://bibpay-api-wahja.ondigitalocean.app";
  private readonly balanceUrl = "https://api.bibbyx.com";

  constructor(private readonly configService: ConfigService) {}

  // ใช้ keys จาก Token ที่ส่งมา
  private getApiKey(token: any): string {
    return token.paymentKey;
  }

  private getSecretKey(token: any): string {
    return token.paymentSecret;
  }

  async createDeposit(
    payload: CreateDepositPayload,
    token: any
  ): Promise<DepositResponse> {
    try {
      const bibpayPayload = {
        bankName: payload.accountName, // เปลี่ยนจาก accountName เป็น bankName
        bankNumber: payload.bankNumber,
        bankCode: payload.bankCode,
        callbackUrl: payload.callbackUrl,
        refferend: payload.refCode, // เปลี่ยนจาก refCode เป็น refferend
        amount: payload.amount.toString(),
      };

      // สร้าง signature สำหรับ BIB-Pay
      const signature = this.generateSignature(bibpayPayload, token);

      // เพิ่ม signature เข้าไปใน payload
      (bibpayPayload as any).signatrure = signature;

      // Log ข้อมูลที่ส่งไป BIB-Pay API
      console.log(`=== Sending to BIB-Pay API (Deposit) ===`);
      console.log(`URL: ${this.baseUrl}/api/v1/mc/payin`);
      console.log(`Payload:`, JSON.stringify(bibpayPayload, null, 2));
      console.log(`Headers:`, {
        "x-api-key": this.getApiKey(token),
        "Content-Type": "application/json",
      });
      console.log(`Signature: ${signature}`);
      console.log(`================================`);

      const response = await axios.post(
        `${this.baseUrl}/api/v1/mc/payin`,
        bibpayPayload,
        {
          headers: {
            "x-api-key": this.getApiKey(token),
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = response.data;

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
          transactionId: responseData.data?.transactionId,
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
      const bibpayPayload = {
        bankName: payload.accountName, // เปลี่ยนจาก accountName เป็น bankName
        bankNumber: payload.bankNumber,
        bankCode: payload.bankCode,
        callbackUrl: payload.callbackUrl,
        refferend: payload.refCode, // เปลี่ยนจาก refCode เป็น refferend
        amount: payload.amount.toString(),
      };

      // สร้าง signature สำหรับ BIB-Pay
      const signature = this.generateSignature(bibpayPayload, token);

      // เพิ่ม signature เข้าไปใน payload
      (bibpayPayload as any).signatrure = signature;

      // Log ข้อมูลที่ส่งไป BIB-Pay API
      console.log(`=== Sending to BIB-Pay API (Withdraw) ===`);
      console.log(`URL: ${this.baseUrl}/api/v1/mc/payout`);
      console.log(`Payload:`, JSON.stringify(bibpayPayload, null, 2));
      console.log(`Headers:`, {
        "x-api-key": this.getApiKey(token),
        "Content-Type": "application/json",
      });
      console.log(`Signature: ${signature}`);
      console.log(`================================`);

      const response = await axios.post(
        `${this.baseUrl}/api/v1/mc/payout`,
        bibpayPayload,
        {
          headers: {
            "x-api-key": this.getApiKey(token),
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
          transactionId: responseData.data?.transactionId,
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

  private generateSignature(payload: any, token: any): string {
    const jwt = require("jsonwebtoken");
    const secret = this.getSecretKey(token);
    const jwtToken = jwt.sign(payload, secret);
    return jwtToken;
  }

  async getBalance(token: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.balanceUrl}/api/v1/mc/balance`,
        {},
        {
          headers: {
            "x-api-key": this.getApiKey(token),
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = response.data;

      if (responseData.status === "success") {
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
