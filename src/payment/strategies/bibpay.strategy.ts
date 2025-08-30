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
        accountName: payload.accountName,
        bankNumber: payload.bankNumber,
        bankCode: payload.bankCode,
        refCode: payload.refCode,
        amount: payload.amount.toString(),
        callbackUrl: payload.callbackUrl,
      };

      // สร้าง signature สำหรับ BIB-Pay
      const signature = this.generateSignature(bibpayPayload, token);

      const response = await axios.post(
        `${this.baseUrl}/api/v1/mc/payin`,
        bibpayPayload,
        {
          headers: {
            "x-api-key": this.getApiKey(token),
            "x-signature": signature,
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = response.data;

      if (responseData.status === "success") {
        // แปลง QR Code string เป็น image URL
        const qrCodeString = responseData.data?.qrCode;
        const qrCodeUrl = qrCodeString
          ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeString)}`
          : undefined;

        return {
          success: true,
          qrcodeUrl: qrCodeUrl,
          message: "Deposit created successfully",
        };
      }

      return {
        success: false,
        message: responseData.message || "Failed to create deposit",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Internal server error",
      };
    }
  }

  async createWithdraw(
    payload: CreateWithdrawPayload,
    token: any
  ): Promise<WithdrawResponse> {
    try {
      const bibpayPayload = {
        accountName: payload.accountName,
        bankNumber: payload.bankNumber,
        bankCode: payload.bankCode,
        refCode: payload.refCode,
        amount: payload.amount.toString(),
        callbackUrl: payload.callbackUrl,
      };

      // สร้าง signature สำหรับ BIB-Pay
      const signature = this.generateSignature(bibpayPayload, token);

      const response = await axios.post(
        `${this.baseUrl}/api/v1/mc/payout`,
        bibpayPayload,
        {
          headers: {
            "x-api-key": this.getApiKey(token),
            "x-signature": signature,
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = response.data;

      if (responseData.status === "success") {
        return {
          success: true,
          message: "",
        };
      }

      return {
        success: false,
        message: responseData.message || "Failed to create withdraw",
      };
    } catch (error) {
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
    // สร้าง signature สำหรับ BIB-Pay
    // ใช้ HMAC-SHA256 หรือวิธีที่ BIB-Pay ต้องการ
    const payloadString = JSON.stringify(payload);
    const secretKey = this.getSecretKey(token);

    // ตัวอย่างการสร้าง signature (ปรับตามที่ BIB-Pay ต้องการ)
    const crypto = require("crypto");
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(payloadString)
      .digest("hex");

    return signature;
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
