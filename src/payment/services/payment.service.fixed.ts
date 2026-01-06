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
        throw new Error("Invalid token: token not found");
      }

      if (!token.isActive) {
        throw new Error("Invalid token: token is inactive");
      }

      // ตรวจสอบว่า token รองรับ payment system ที่ต้องการหรือไม่
      if (!token.paymentSys) {
        throw new Error(
          `Token does not support any payment system. Please configure payment_sys first.`
        );
      }

      // Validate gateway type from token
      if (
        !Object.values(GatewayType).includes(token.paymentSys as GatewayType)
      ) {
        throw new Error(`Invalid payment system in token: ${token.paymentSys}`);
      }

      // Check if deposit already exists
      const existingDeposit = await prisma.payment_deposits.findUnique({
        where: { ref_code: payload.refCode },
      });

      if (existingDeposit) {
        throw new Error(
          `Deposit with ref_code ${payload.refCode} already exists`
        );
      }

      // Create deposit record in database
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
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Get payment gateway strategy
      const gateway = this.paymentGatewayFactory.createGateway(
        token.paymentSys as GatewayType
      );

      // Call external payment gateway
      const gatewayResponse = await gateway.createDeposit(payload);

      if (gatewayResponse.success) {
        // Update deposit record with QR code
        await prisma.payment_deposits.update({
          where: { id: depositRecord.id },
          data: {
            qr_code: gatewayResponse.qrcodeUrl,
            updated_at: new Date(),
          },
        });

        this.logger.log(`Deposit created successfully for ${payload.refCode}`);
        return {
          success: true,
          message: gatewayResponse.message,
          qrcodeUrl: gatewayResponse.qrcodeUrl,
        };
      } else {
        // Update deposit record with error status
        await prisma.payment_deposits.update({
          where: { id: depositRecord.id },
          data: {
            status: PaymentStatus.FAIL,
            updated_at: new Date(),
          },
        });

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
      throw error;
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
        throw new Error("Invalid token: token not found");
      }

      if (!token.isActive) {
        throw new Error("Invalid token: token is inactive");
      }

      // ตรวจสอบว่า token รองรับ payment system ที่ต้องการหรือไม่
      if (!token.paymentSys) {
        throw new Error(
          `Token does not support any payment system. Please configure payment_sys first.`
        );
      }

      // Validate gateway type from token
      if (
        !Object.values(GatewayType).includes(token.paymentSys as GatewayType)
      ) {
        throw new Error(`Invalid payment system in token: ${token.paymentSys}`);
      }

      // Check if withdraw already exists
      const existingWithdraw = await prisma.payment_withdraw.findUnique({
        where: { ref_code: payload.refCode },
      });

      if (existingWithdraw) {
        throw new Error(
          `Withdraw with ref_code ${payload.refCode} already exists`
        );
      }

      // Create withdraw record in database
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
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Get payment gateway strategy
      const gateway = this.paymentGatewayFactory.createGateway(
        token.paymentSys as GatewayType
      );

      // Call external payment gateway
      const gatewayResponse = await gateway.createWithdraw(payload);

      if (gatewayResponse.success) {
        // Update withdraw record
        await prisma.payment_withdraw.update({
          where: { id: withdrawRecord.id },
          data: {
            updated_at: new Date(),
          },
        });

        this.logger.log(`Withdraw created successfully for ${payload.refCode}`);
        return {
          success: true,
          message: gatewayResponse.message,
        };
      } else {
        // Update withdraw record with error status
        await prisma.payment_withdraw.update({
          where: { id: withdrawRecord.id },
          data: {
            status: PaymentStatus.FAIL,
            updated_at: new Date(),
          },
        });

        this.logger.error(
          `Failed to create withdraw for ${payload.refCode}: ${gatewayResponse.message}`
        );
        return {
          success: false,
          message: gatewayResponse.message,
        };
      }
    } catch (error) {
      this.logger.error(`Error creating withdraw: ${error.message}`);
      throw error;
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
      throw error;
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
}
