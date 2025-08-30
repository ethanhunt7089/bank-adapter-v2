import { Controller, Post, Body, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from "@nestjs/swagger";
import { PaymentService } from "../services/payment.service";

@ApiTags("Webhooks")
@Controller("webhooks")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post("bibpay")
  @ApiOperation({ summary: "Receive webhook from BIB-Pay" })
  @ApiBody({
    description: "Webhook data from BIB-Pay",
    schema: {
      type: "object",
      properties: {
        refCode: { type: "string", example: "trx-001" },
        status: { type: "string", example: "success" },
        transactionId: { type: "string", example: "TRX-BIB-1234567890-ABC123" },
        amount: { type: "number", example: 100 },
        message: { type: "string", example: "Payment completed" },
        data: { type: "object" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Webhook received successfully" })
  async handleBibPayWebhook(@Body() webhookData: any) {
    // Log ข้อมูลที่ได้รับจาก BIB-Pay
    this.logger.log("=== BIB-Pay Webhook Received ===");
    this.logger.log(
      `Raw webhook data: ${JSON.stringify(webhookData, null, 2)}`
    );
    this.logger.log(`Webhook data type: ${typeof webhookData}`);
    this.logger.log(
      `Webhook data keys: ${Object.keys(webhookData).join(", ")}`
    );

    // Log แต่ละ field ที่สำคัญ
    if (webhookData.refCode) this.logger.log(`refCode: ${webhookData.refCode}`);
    if (webhookData.refferend)
      this.logger.log(`refferend: ${webhookData.refferend}`);
    if (webhookData.status) this.logger.log(`status: ${webhookData.status}`);
    if (webhookData.amount) this.logger.log(`amount: ${webhookData.amount}`);
    if (webhookData.transactionId)
      this.logger.log(`transactionId: ${webhookData.transactionId}`);
    if (webhookData.message) this.logger.log(`message: ${webhookData.message}`);
    if (webhookData.transactionType)
      this.logger.log(`transactionType: ${webhookData.transactionType}`);

    // Log headers และ metadata อื่นๆ
    this.logger.log(`Webhook timestamp: ${new Date().toISOString()}`);
    this.logger.log("=== End BIB-Pay Webhook Data ===");

    try {
      // เรียก PaymentService เพื่อประมวลผล webhook
      await this.paymentService.handleWebhook({
        refCode: webhookData.refCode || webhookData.refferend,
        transactionType: webhookData.transactionType || "deposit", // รองรับทั้ง deposit และ withdraw
        gatewayType: "bibpay",
        data: webhookData,
      });

      this.logger.log("✅ BIB-Pay webhook processed successfully");
      return { success: true, message: "Webhook processed successfully" };
    } catch (error) {
      this.logger.error(
        `❌ Error processing BIB-Pay webhook: ${error.message}`
      );
      this.logger.error(`Error stack: ${error.stack}`);
      return { success: false, message: error.message };
    }
  }

  @Post("easypay")
  @ApiOperation({ summary: "Receive webhook from Easy-Pay" })
  @ApiBody({
    description: "Webhook data from Easy-Pay",
    schema: {
      type: "object",
      properties: {
        refCode: { type: "string", example: "trx-002" },
        status: { type: "string", example: "success" },
        transactionId: {
          type: "string",
          example: "TRX-EASY-1234567890-DEF456",
        },
        amount: { type: "number", example: 200 },
        message: { type: "string", example: "Payment completed" },
        data: { type: "object" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Webhook received successfully" })
  async handleEasyPayWebhook(@Body() webhookData: any) {
    // Log ข้อมูลที่ได้รับจาก Easy-Pay
    this.logger.log("=== Easy-Pay Webhook Received ===");
    this.logger.log(
      `Raw webhook data: ${JSON.stringify(webhookData, null, 2)}`
    );
    this.logger.log(`Webhook data type: ${typeof webhookData}`);
    this.logger.log(
      `Webhook data keys: ${Object.keys(webhookData).join(", ")}`
    );

    // Log แต่ละ field ที่สำคัญ
    if (webhookData.refCode) this.logger.log(`refCode: ${webhookData.refCode}`);
    if (webhookData.status) this.logger.log(`status: ${webhookData.status}`);
    if (webhookData.amount) this.logger.log(`amount: ${webhookData.amount}`);
    if (webhookData.transactionId)
      this.logger.log(`transactionId: ${webhookData.transactionId}`);
    if (webhookData.message) this.logger.log(`message: ${webhookData.message}`);
    if (webhookData.transactionType)
      this.logger.log(`transactionType: ${webhookData.transactionType}`);

    // Log headers และ metadata อื่นๆ
    this.logger.log(`Webhook timestamp: ${new Date().toISOString()}`);
    this.logger.log("=== End Easy-Pay Webhook Data ===");

    try {
      // เรียก PaymentService เพื่อประมวลผล webhook
      await this.paymentService.handleWebhook({
        refCode: webhookData.refCode,
        transactionType: webhookData.transactionType || "deposit", // รองรับทั้ง deposit และ withdraw
        gatewayType: "easypay",
        data: webhookData,
      });

      this.logger.log("✅ Easy-Pay webhook processed successfully");
      return { success: true, message: "Webhook processed successfully" };
    } catch (error) {
      this.logger.error(
        `❌ Error processing Easy-Pay webhook: ${error.message}`
      );
      this.logger.error(`Error stack: ${error.stack}`);
      return { success: false, message: error.message };
    }
  }
}
