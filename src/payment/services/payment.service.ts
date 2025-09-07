import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "../../lib/prisma";
import { PaymentGatewayFactory } from "../factories/payment-gateway.factory";
import {
  CreateDepositPayload,
  CreateWithdrawPayload,
  DepositResponse,
  WithdrawResponse,
  WebhookData,
  GatewayType,
  PaymentStatus,
  TransactionType,
} from "../interfaces/payment-gateway.interface";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly paymentGatewayFactory: PaymentGatewayFactory) {}

  async createDeposit(
    payload: CreateDepositPayload,
    tokenUuid: string
  ): Promise<DepositResponse> {
    try {
      this.logger.log(`Creating deposit with ref: ${payload.refCode}`);

      // ตรวจสอบ token และ payment_sys
      const token = await prisma.token.findUnique({
        where: { uuid: tokenUuid },
      });

      if (!token) {
        return {
          success: false,
          message: "Invalid token: token not found",
        };
      }

      if (!token.isActive) {
        return {
          success: false,
          message: "Invalid token: token is inactive",
        };
      }

      // ตรวจสอบว่า token รองรับ payment system ที่ต้องการหรือไม่
      if (!token.paymentSys) {
        return {
          success: false,
          message: `Token does not support any payment system. Please configure payment_sys first.`,
        };
      }

      // Validate gateway type from token
      if (
        !Object.values(GatewayType).includes(token.paymentSys as GatewayType)
      ) {
        return {
          success: false,
          message: `Invalid payment system in token: ${token.paymentSys}`,
        };
      }

      // Check if deposit already exists
      const existingDeposit = await prisma.payment_deposits.findUnique({
        where: { ref_code: payload.refCode },
      });

      if (existingDeposit) {
        return {
          success: false,
          message: `Deposit with ref_code ${payload.refCode} already exists`,
        };
      }

      // Get payment gateway strategy
      const gateway = this.paymentGatewayFactory.createGateway(
        token.paymentSys as GatewayType
      );

      // Log ข้อมูลที่ส่งไป Payment Gateway
      this.logger.log(`=== Sending to Payment Gateway ===`);
      this.logger.log(`Gateway Type: ${token.paymentSys}`);
      this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
      this.logger.log(`Token UUID: ${token.uuid}`);
      this.logger.log(`Payment Key: ${(token as any).paymentKey || "NOT SET"}`);
      this.logger.log(`Payment Secret: ${(token as any).paymentSecret}`);
      this.logger.log(`================================`);

      // Call external payment gateway ก่อน
      const gatewayResponse = await gateway.createDeposit(payload, token);

      if (gatewayResponse.success) {
        // สร้าง record ใน database เมื่อ Payment Gateway success
        const depositRecord = await prisma.payment_deposits.create({
          data: {
            ref_code: payload.refCode,
            amount: payload.amount,
            deposit_amount: payload.amount,
            account_name: payload.accountName,
            bank_number: payload.bankNumber,
            bank_code: payload.bankCode,
            callback_url: payload.callbackUrl,
            gateway_type: token.paymentSys,
            status: PaymentStatus.PENDING,
            qr_code: gatewayResponse.qrcodeUrl,
            gateway_transaction_id: gatewayResponse.paymentTrx,
            gateway_response: gatewayResponse.gatewayResponse,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        this.logger.log(`Deposit created successfully for ${payload.refCode}`);
        return {
          success: true,
          message: gatewayResponse.message,
          qrcodeUrl: gatewayResponse.qrcodeUrl,
          paymentTrx: gatewayResponse.paymentTrx,
        };
      } else {
        // ไม่สร้าง record ถ้า Payment Gateway fail
        this.logger.error(
          `Failed to create deposit for ${payload.refCode}: ${gatewayResponse.message}`
        );
        return {
          success: false,
          message: gatewayResponse.message,
        };
      }
    } catch (error) {
      this.logger.error(`Error creating deposit: ${error.message}`);

      // Return error message จาก Payment Gateway แทนที่จะ throw error
      return {
        success: false,
        message: error.message || "Internal server error",
      };
    }
  }

  async createWithdraw(
    payload: CreateWithdrawPayload,
    tokenUuid: string
  ): Promise<WithdrawResponse> {
    try {
      this.logger.log(`Creating withdraw with ref: ${payload.refCode}`);

      // ตรวจสอบ token และ payment_sys
      const token = await prisma.token.findUnique({
        where: { uuid: tokenUuid },
      });

      if (!token) {
        return {
          success: false,
          message: "Invalid token: token not found",
        };
      }

      if (!token.isActive) {
        return {
          success: false,
          message: "Invalid token: token is inactive",
        };
      }

      // ตรวจสอบว่า token รองรับ payment system ที่ต้องการหรือไม่
      if (!token.paymentSys) {
        return {
          success: false,
          message: `Token does not support any payment system. Please configure payment_sys first.`,
        };
      }

      // Validate gateway type from token
      if (
        !Object.values(GatewayType).includes(token.paymentSys as GatewayType)
      ) {
        return {
          success: false,
          message: `Invalid payment system in token: ${token.paymentSys}`,
        };
      }

      // Check if withdraw already exists
      const existingWithdraw = await prisma.payment_withdraw.findUnique({
        where: { ref_code: payload.refCode },
      });

      if (existingWithdraw) {
        return {
          success: false,
          message: `Withdraw with ref_code ${payload.refCode} already exists`,
        };
      }

      // Get payment gateway strategy
      const gateway = this.paymentGatewayFactory.createGateway(
        token.paymentSys as GatewayType
      );

      // Log ข้อมูลที่ส่งไป Payment Gateway
      this.logger.log(`=== Sending to Payment Gateway (Withdraw) ===`);
      this.logger.log(`Gateway Type: ${token.paymentSys}`);
      this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
      this.logger.log(`Token UUID: ${token.uuid}`);
      this.logger.log(`Payment Key: ${(token as any).paymentKey || "NOT SET"}`);
      this.logger.log(`Payment Secret: ${(token as any).paymentSecret}`);
      this.logger.log(`================================`);

      // Call external payment gateway ก่อน
      const gatewayResponse = await gateway.createWithdraw(payload, token);

      // Log response จาก Payment Gateway
      this.logger.log(`=== Payment Gateway Response (Withdraw) ===`);
      this.logger.log(`Response: ${JSON.stringify(gatewayResponse, null, 2)}`);
      this.logger.log(`Success: ${gatewayResponse.success}`);
      this.logger.log(`Message: ${gatewayResponse.message}`);
      this.logger.log(`Message Type: ${typeof gatewayResponse.message}`);
      this.logger.log(
        `Message Length: ${gatewayResponse.message?.length || 0}`
      );
      this.logger.log(`Transaction ID: ${gatewayResponse.paymentTrx || "N/A"}`);
      this.logger.log(
        `Gateway Response Keys: ${Object.keys(gatewayResponse || {})}`
      );
      this.logger.log(`Gateway Response Type: ${typeof gatewayResponse}`);
      this.logger.log(`================================`);

      if (gatewayResponse.success) {
        // ถ้า gateway success แล้วค่อยสร้าง record ใน database
        this.logger.log(`=== Creating Database Record (Withdraw) ===`);
        this.logger.log(`Ref Code: ${payload.refCode}`);
        this.logger.log(`Amount: ${payload.amount}`);
        this.logger.log(`Account Name: ${payload.accountName}`);
        this.logger.log(`Bank Number: ${payload.bankNumber}`);
        this.logger.log(`Bank Code: ${payload.bankCode}`);
        this.logger.log(
          `Gateway Transaction ID: ${gatewayResponse.paymentTrx || "N/A"}`
        );
        this.logger.log(`================================`);

        const withdrawRecord = await prisma.payment_withdraw.create({
          data: {
            ref_code: payload.refCode,
            amount: payload.amount,
            account_name: payload.accountName,
            bank_number: payload.bankNumber,
            bank_code: payload.bankCode,
            callback_url: payload.callbackUrl,
            gateway_type: token.paymentSys,
            status: PaymentStatus.PENDING,
            gateway_transaction_id: gatewayResponse.paymentTrx,
            gateway_response: gatewayResponse.gatewayResponse,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        this.logger.log(`=== Database Record Created (Withdraw) ===`);
        this.logger.log(`Record ID: ${withdrawRecord.id}`);
        this.logger.log(`Status: ${withdrawRecord.status}`);
        this.logger.log(`Created At: ${withdrawRecord.created_at}`);
        this.logger.log(`================================`);
        this.logger.log(`Withdraw created successfully for ${payload.refCode}`);
        // สร้าง message ที่เหมาะสม
        let message = gatewayResponse.message;

        // Debug message creation
        this.logger.log(`=== Message Creation Debug ===`);
        this.logger.log(`Original message: ${message}`);
        this.logger.log(`Message type: ${typeof message}`);
        this.logger.log(`Message length: ${message?.length || 0}`);
        this.logger.log(
          `Message is empty: ${!message || message.trim() === ""}`
        );
        this.logger.log(`================================`);

        if (!message || message.trim() === "") {
          message = `Withdraw created successfully. Amount: ${payload.amount} THB. Transaction ID: ${gatewayResponse.paymentTrx || "N/A"}`;
          this.logger.log(`Using fallback message: ${message}`);
        }

        return {
          success: true,
          message: message,
          paymentTrx: gatewayResponse.paymentTrx,
          refCode: payload.refCode,
        };
      } else {
        // ถ้า gateway fail ไม่ต้องสร้าง record ใน database
        this.logger.error(`=== Payment Gateway Failed (Withdraw) ===`);
        this.logger.error(`Ref Code: ${payload.refCode}`);
        this.logger.error(`Error Message: ${gatewayResponse.message}`);
        this.logger.error(
          `Gateway Response: ${JSON.stringify(gatewayResponse, null, 2)}`
        );
        this.logger.error(`================================`);

        return {
          success: false,
          message: gatewayResponse.message,
        };
      }
    } catch (error) {
      this.logger.error(`Error creating withdraw: ${error.message}`);

      // Return error message แทนที่จะ throw error
      return {
        success: false,
        message: error.message || "Internal server error",
      };
    }
  }

  async handleWebhook(webhookData: WebhookData): Promise<void> {
    try {
      this.logger.log(
        `Processing webhook for ${webhookData.gatewayType} with ref: ${webhookData.refCode}`
      );

      // Store webhook data
      await prisma.payment_webhooks.create({
        data: {
          ref_code: webhookData.refCode,
          transaction_type: webhookData.transactionType,
          gateway_type: webhookData.gatewayType,
          webhook_data: webhookData.data,
          status: "received",
          created_at: new Date(),
        },
      });

      // 1. แยกแยะ TransactionType (deposit vs withdraw)
      const refCode = webhookData.refCode;
      const depositRecord = await prisma.payment_deposits.findFirst({
        where: { ref_code: refCode },
      });
      const withdrawRecord = await prisma.payment_withdraw.findFirst({
        where: { ref_code: refCode },
      });

      let transactionType: "deposit" | "withdraw";
      if (depositRecord) {
        transactionType = "deposit";
      } else if (withdrawRecord) {
        transactionType = "withdraw";
      } else {
        transactionType = "deposit"; // fallback
      }

      // 2. สร้างข้อมูลตาม Format ที่คุณกำหนด
      const userCallbackData = {
        status: webhookData.data?.status,
        message:
          webhookData.data?.status === "completed"
            ? null
            : webhookData.data?.message,
        data: {
          transactionType: transactionType,
          transactionId: webhookData.data?.data?.transactionId,
          refCode:
            webhookData.data?.data?.refferend ||
            webhookData.data?.data?.reference,
          amount: webhookData.data?.data?.amount,
          bank: {
            name: webhookData.data?.data?.bank?.name,
            code: webhookData.data?.data?.bank?.code,
          },
          bankNumber:
            webhookData.data?.data?.bankNumber ||
            webhookData.data?.data?.bnakNumber,
          accountName:
            webhookData.data?.data?.name || webhookData.data?.data?.bankName,
        },
      };

      // 3. จัดการ Message ตามเงื่อนไข (completed = null, อื่นๆ = webhook message)
      // ทำแล้วในขั้นตอนที่ 2

      // 4. Forward ไปยัง User's callback_url
      if (depositRecord?.callback_url || withdrawRecord?.callback_url) {
        const userCallbackUrl =
          depositRecord?.callback_url || withdrawRecord?.callback_url;

        // ตรวจสอบว่าไม่ใช่ URL ของตัวเอง เพื่อป้องกัน loop
        if (
          userCallbackUrl !==
          "https://central-dragon-11.com/bcel-api/webhooks/bibpay"
        ) {
          try {
            // ส่งข้อมูลไปยัง User's callback_url
            await this.forwardToUserCallback(userCallbackData, userCallbackUrl);
            this.logger.log(
              `Forwarded webhook to user callback: ${userCallbackUrl}`
            );
          } catch (forwardError) {
            this.logger.error(
              `Failed to forward webhook to user: ${forwardError.message}`
            );
          }
        } else {
          this.logger.warn(
            `Skipped forwarding webhook to own URL to prevent loop: ${userCallbackUrl}`
          );
        }
      }

      // Debug log สำหรับ deposit status update
      this.logger.log(`=== Deposit Status Update Debug ===`);
      this.logger.log(`transactionType: ${transactionType}`);
      this.logger.log(
        `webhookData.data?.data?.status: ${webhookData.data?.data?.status}`
      );
      this.logger.log(
        `webhookData.data: ${JSON.stringify(webhookData.data, null, 2)}`
      );
      this.logger.log(`================================`);

      // อัพเดท deposit status ถ้าเป็น deposit webhook
      if (
        transactionType === "deposit" &&
        (webhookData.data?.data?.status === "completed" ||
          webhookData.data?.data?.status === "success" ||
          webhookData.data?.data?.status === true ||
          webhookData.data?.data?.status === "paid" ||
          webhookData.data?.data?.status === "confirmed" ||
          webhookData.data?.status === "completed" ||
          webhookData.data?.status === "success" ||
          webhookData.data?.status === true ||
          webhookData.data?.status === "paid" ||
          webhookData.data?.status === "confirmed")
      ) {
        try {
          await prisma.payment_deposits.updateMany({
            where: {
              ref_code: webhookData.refCode,
              gateway_type: webhookData.gatewayType,
            },
            data: {
              status: "completed",
              updated_at: new Date(),
              completed_at: new Date(),
            },
          });
          this.logger.log(`Deposit ${webhookData.refCode} marked as completed`);
        } catch (updateError) {
          this.logger.warn(
            `Could not update deposit status for ${webhookData.refCode}: ${updateError.message}`
          );
        }
      }

      // Debug log สำหรับ withdraw status update
      this.logger.log(`=== Withdraw Status Update Debug ===`);
      this.logger.log(`transactionType: ${transactionType}`);
      this.logger.log(`webhookData.data?.status: ${webhookData.data?.status}`);
      this.logger.log(
        `webhookData.data: ${JSON.stringify(webhookData.data, null, 2)}`
      );
      this.logger.log(`================================`);

      // อัพเดท withdraw status ถ้าเป็น withdraw webhook
      if (
        transactionType === "withdraw" &&
        (webhookData.data?.status === "completed" ||
          webhookData.data?.status === "success" ||
          webhookData.data?.status === true ||
          webhookData.data?.status === "paid" ||
          webhookData.data?.status === "confirmed" ||
          webhookData.data?.data?.status === "completed" || // เพิ่มเพื่อรองรับ nested structure
          webhookData.data?.data?.status === "success" ||
          webhookData.data?.data?.status === true ||
          webhookData.data?.data?.status === "paid" ||
          webhookData.data?.data?.status === "confirmed")
      ) {
        try {
          await prisma.payment_withdraw.updateMany({
            where: {
              ref_code: webhookData.refCode,
              gateway_type: webhookData.gatewayType,
            },
            data: {
              status: "completed",
              updated_at: new Date(),
              completed_at: new Date(),
            },
          });
          this.logger.log(
            `Withdraw ${webhookData.refCode} marked as completed`
          );
        } catch (updateError) {
          this.logger.warn(
            `Could not update withdraw status for ${webhookData.refCode}: ${updateError.message}`
          );
        }
      }

      // Get payment gateway strategy
      const gateway = this.paymentGatewayFactory.createGateway(
        webhookData.gatewayType as GatewayType
      );

      // Process webhook with strategy
      await gateway.handleWebhook(webhookData);

      // Update webhook status
      await prisma.payment_webhooks.updateMany({
        where: {
          ref_code: webhookData.refCode,
          gateway_type: webhookData.gatewayType,
        },
        data: {
          status: "processed",
          processed_at: new Date(),
        },
      });

      this.logger.log(
        `Webhook processed successfully for ${webhookData.refCode}`
      );
    } catch (error) {
      this.logger.error(`Error processing webhook: ${error.message}`);
      // ไม่ throw error เพราะ return type เป็น void
    }
  }

  async getDepositStatus(refCode: string): Promise<any> {
    return prisma.payment_deposits.findUnique({
      where: { ref_code: refCode },
    });
  }

  async getWithdrawStatus(refCode: string): Promise<any> {
    return prisma.payment_withdraw.findUnique({
      where: { ref_code: refCode },
    });
  }

  // Method สำหรับหา deposit record โดยใช้ refCode
  async findDepositByRefCode(refCode: string): Promise<any> {
    return prisma.payment_deposits.findUnique({
      where: { ref_code: refCode },
    });
  }

  // Method สำหรับหา withdraw record โดยใช้ refCode
  async findWithdrawByRefCode(refCode: string): Promise<any> {
    return prisma.payment_withdraw.findUnique({
      where: { ref_code: refCode },
    });
  }

  async getBalance(tokenUuid: string): Promise<any> {
    try {
      // ตรวจสอบ token และ payment_sys
      const token = await prisma.token.findUnique({
        where: { uuid: tokenUuid },
      });

      if (!token) {
        throw new Error("Invalid token: token not found");
      }

      if (!token.isActive) {
        throw new Error("Invalid token: token is inactive");
      }

      if (!token.paymentSys) {
        throw new Error("Token does not support any payment system");
      }

      // Get payment gateway strategy
      const gateway = this.paymentGatewayFactory.createGateway(
        token.paymentSys as GatewayType
      );

      // Call external payment gateway to get balance
      // This will be implemented in each strategy
      const balanceResponse = await (gateway as any).getBalance(token);

      return {
        success: true,
        balance: balanceResponse.balance,
      };
    } catch (error) {
      this.logger.error(`Error getting balance: ${error.message}`);
      throw error;
    }
  }

  // Method สำหรับ forward webhook ไปยัง User's callback_url
  private async forwardToUserCallback(
    callbackData: any,
    callbackUrl: string
  ): Promise<void> {
    try {
      const axios = require("axios");

      const response = await axios.post(callbackUrl, callbackData, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Bank-Adapter-v2/1.0",
        },
        timeout: 10000, // 10 seconds timeout
      });

      this.logger.log(
        `Successfully forwarded to user callback: ${callbackUrl}, Status: ${response.status}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to forward to user callback ${callbackUrl}: ${error.message}`
      );
      throw error;
    }
  }
}
