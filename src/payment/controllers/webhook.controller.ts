import { Controller, Post, Body, Logger } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { PaymentService } from "../services/payment.service";

@ApiExcludeController()
@Controller()
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post("webhooks/bibpay")
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
      // สร้าง refCode จาก webhook data - รองรับหลาย field names
      const refCode =
        webhookData.refCode ||
        webhookData.refferend ||
        webhookData.reference ||
        webhookData.data?.refCode ||
        webhookData.data?.refferend ||
        webhookData.data?.reference ||
        `WEBHOOK-${Date.now()}`;

      // เรียก PaymentService เพื่อประมวลผล webhook
      await this.paymentService.handleWebhook({
        refCode: refCode,
        transactionType: webhookData.transactionType || "deposit",
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

  @Post("webhooks/easypay")
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

  // Endpoint ใหม่สำหรับทดสอบ webhook
  @Post("webhooks/test-webhook")
  async handleTestWebhook(
    @Body() webhookData: any
  ): Promise<{ message: string; received: any }> {
    this.logger.log(`=== TEST WEBHOOK RECEIVED ===`);
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
    this.logger.log(`Raw Data: ${JSON.stringify(webhookData, null, 2)}`);
    this.logger.log(`Data Type: ${typeof webhookData}`);
    this.logger.log(`Data Keys: ${Object.keys(webhookData || {}).join(", ")}`);
    this.logger.log(`=== END TEST WEBHOOK ===`);

    return {
      message: "Test webhook received and logged successfully",
      received: webhookData,
    };
  }
}
