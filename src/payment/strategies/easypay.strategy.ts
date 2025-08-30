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
export class EasyPayStrategy implements IPaymentGateway {
  private readonly baseUrl = "https://api.bibbyx.com";

  constructor(private readonly configService: ConfigService) {}

  async createDeposit(
    payload: CreateDepositPayload,
    token: any
  ): Promise<DepositResponse> {
    try {
      const easypayPayload = {
        accountName: payload.accountName,
        bankNumber: payload.bankNumber,
        bankCode: payload.bankCode,
        refCode: payload.refCode,
        amount: payload.amount.toString(),
        callbackUrl: payload.callbackUrl,
      };

      const response = await axios.post(
        `${this.baseUrl}/api/v1/cs/deposit`,
        easypayPayload,
        {
          headers: {
            Authorization: `Bearer ${token.paymentKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const responseData = response.data;

      if (responseData.status === "success") {
        return {
          success: true,
          qrcodeUrl: responseData.data?.qrCode,
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
      const easypayPayload = {
        accountName: payload.accountName,
        bankNumber: payload.bankNumber,
        bankCode: payload.bankCode,
        refCode: payload.refCode,
        amount: payload.amount.toString(),
        callbackUrl: payload.callbackUrl,
      };

      const response = await axios.post(
        `${this.baseUrl}/api/v1/cs/withdraw`,
        easypayPayload,
        {
          headers: {
            Authorization: `Bearer ${token.paymentKey}`,
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
    // Easy-Pay webhook handling logic
    // This will be implemented based on the webhook data structure
    console.log("Easy-Pay webhook received:", webhookData);
  }

  getGatewayType(): GatewayType {
    return GatewayType.EASYPAY;
  }

  async getBalance(token: any): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/cs/balance`, {
        headers: {
          Authorization: `Bearer ${token.paymentKey}`,
          "Content-Type": "application/json",
        },
      });

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
