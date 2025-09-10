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

  // ดึง credentials จาก Token
  private getAccessKey(token: any): string {
    return token.paymentAccess;
  }

  private getSecretKey(token: any): string {
    return token.paymentSecret;
  }

  private getAuthToken(token: any): string {
    return token.paymentKey;
  }

  // สร้าง authentication token
  private async authenticate(token: any): Promise<string | null> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/authenticate`,
        {
          accessKey: this.getAccessKey(token),
          secretKey: this.getSecretKey(token),
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
        await this.prisma.token.update({
          where: { uuid: token.uuid },
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

  // จัดการ customer - สร้างใหม่หรือดึงที่มีอยู่
  private async getOrCreateCustomer(
    payload: CreateDepositPayload | CreateWithdrawPayload,
    authToken: string
  ): Promise<string | null> {
    try {
      // เช็คว่ามี customer อยู่แล้วหรือไม่
      const existingCustomer = await this.prisma.payonexCustomer.findUnique({
        where: {
          unique_payonex_customer: {
            accountName: payload.accountName,
            bankNumber: payload.bankNumber,
            bankCode: payload.bankCode,
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
          bankCode: payload.bankCode,
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
            bankCode: payload.bankCode,
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

      // 1. Authenticate
      const authToken = await this.authenticate(token);
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

      // 1. Authenticate
      const authToken = await this.authenticate(token);
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

      this.logger.log(`=== Sending to PayOneX API (Withdraw) ===`);
      this.logger.log(`URL: ${this.baseUrl}/transactions/withdraw/request`);
      this.logger.log(`Payload:`, JSON.stringify(payonexPayload, null, 2));
      this.logger.log(`Authorization: ${authToken}`);
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
      const authToken = await this.authenticate(token);
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
