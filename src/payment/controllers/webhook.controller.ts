import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  Req, // เพิ่ม Req decorator
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { getCasApiUrl, handleCasCallback, loginToCas } from "../../lib/cas-api-utils";
import { prisma } from "../../lib/prisma";
import { verifyTrueMoneyToken } from '../../lib/true-money-utils';
import { logTrueMoneyWebhook } from "../../lib/winston-logger.config";
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
      // เอา reference จาก webhookData.data เป็นหลัก
      const refCode =
        webhookData.data?.reference ||
        webhookData.data?.refferend ||
        webhookData.data?.refCode ||
        webhookData.reference ||
        webhookData.refferend ||
        webhookData.refCode ||
        `WEBHOOK-${Date.now()}`;

      // หา transactionType จาก database โดยใช้ refCode
      let transactionType: "deposit" | "withdraw" | undefined;

      // หาใน payment_deposits
      const depositRecord =
        await this.paymentService.findDepositByRefCode(refCode);
      if (depositRecord) {
        transactionType = "deposit";
      } else {
        // หาใน payment_withdraw
        const withdrawRecord =
          await this.paymentService.findWithdrawByRefCode(refCode);
        if (withdrawRecord) {
          transactionType = "withdraw";
        }
      }

      // เรียก PaymentService เพื่อประมวลผล webhook
      await this.paymentService.handleWebhook({
        refCode: refCode,
        transactionType: transactionType, // ส่ง transactionType ที่หาได้จาก database
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

  @Post("webhooks/payonex")
  async handlePayOneXWebhook(@Body() webhookData: any) {
    // Log ข้อมูลที่ได้รับจาก PayOneX
    this.logger.log("=== PayOneX Webhook Received ===");
    this.logger.log(
      `Raw webhook data: ${JSON.stringify(webhookData, null, 2)}`
    );
    this.logger.log(`Webhook data type: ${typeof webhookData}`);
    this.logger.log(
      `Webhook data keys: ${Object.keys(webhookData).join(", ")}`
    );

    // Log แต่ละ field ที่สำคัญ
    if (webhookData.referenceId)
      this.logger.log(`referenceId: ${webhookData.referenceId}`);
    if (webhookData.status) this.logger.log(`status: ${webhookData.status}`);
    if (webhookData.amount) this.logger.log(`amount: ${webhookData.amount}`);
    if (webhookData.transactionId)
      this.logger.log(`transactionId: ${webhookData.transactionId}`);
    if (webhookData.message) this.logger.log(`message: ${webhookData.message}`);
    if (webhookData.transactionType)
      this.logger.log(`transactionType: ${webhookData.transactionType}`);

    // Log headers และ metadata อื่นๆ
    this.logger.log(`Webhook timestamp: ${new Date().toISOString()}`);
    this.logger.log("=== End PayOneX Webhook Data ===");

    try {
      // เอา reference จาก webhookData
      const refCode =
        webhookData.referenceId ||
        webhookData.data?.referenceId ||
        webhookData.refCode ||
        `PAYONEX-WEBHOOK-${Date.now()}`;

      // หา transactionType จาก database โดยใช้ refCode
      let transactionType: "deposit" | "withdraw" | undefined;

      // หาใน payment_deposits
      const depositRecord =
        await this.paymentService.findDepositByRefCode(refCode);
      if (depositRecord) {
        transactionType = "deposit";
      } else {
        // หาใน payment_withdraw
        const withdrawRecord =
          await this.paymentService.findWithdrawByRefCode(refCode);
        if (withdrawRecord) {
          transactionType = "withdraw";
        }
      }

      // เรียก PaymentService เพื่อประมวลผล webhook
      await this.paymentService.handleWebhook({
        refCode: refCode,
        transactionType: transactionType,
        gatewayType: "payonex",
        data: webhookData,
      });

      this.logger.log("✅ PayOneX webhook processed successfully");
      return {
        success: true,
        message: "PayOneX webhook processed successfully",
      };
    } catch (error) {
      this.logger.error(
        `❌ Error processing PayOneX webhook: ${error.message}`
      );
      this.logger.error(`Error stack: ${error.stack}`);
      return { success: false, message: error.message };
    }
  }

  // EasyPay webhook endpoint removed since EasyPay strategy is no longer used

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
  // TrueMoney Webhook - POST Method
  @Post("true-money/webhook")
  @HttpCode(200)
  async handleTrueMoneyWebhookPost(@Body() webhookData: any, @Req() req: any) {
    this.logger.log("=== TrueMoney Webhook (POST) Received ===");
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
    this.logger.log(`Method: POST`);
    this.logger.log(`Raw Data: ${JSON.stringify(webhookData, null, 2)}`);
    
    // Log to file
    logTrueMoneyWebhook({
      event: 'WEBHOOK_RECEIVED',
      method: 'POST',
      rawData: webhookData,
      timestamp: new Date().toISOString(),
    });

    try {
      // ดึงข้อมูล host และ domain
      const protocol = req.protocol;  // 'http' หรือ 'https'
      const hostname = req.hostname;  // 'bank.chok369.xyz'
      
      // แยกเอา domain หลัก (chok369.xyz)
      const domainParts = hostname.split('.');
      const mainDomain = domainParts.slice(-2).join('.');  // 'chok369.xyz'
      
      // สร้าง target_domain แบบเต็ม (https://chok369.xyz)
      const targetDomain = `https://${mainDomain}`;
      
      this.logger.log(`Target Domain: ${targetDomain}`);
      this.logger.log(`Prisma object: ${typeof prisma}`);
      this.logger.log(`Prisma is undefined: ${prisma === undefined}`);
      this.logger.log(`Prisma keys: ${prisma ? Object.keys(prisma).slice(0, 5).join(', ') : 'N/A'}`);
      
      // ดึงข้อมูลจาก bo_token
      const boToken = await prisma.boToken.findFirst({
        where: {
          targetDomain: targetDomain,
          isActive: true
        }
      });
      
      this.logger.log(`Query result: ${boToken ? 'Found' : 'Not found'}`);
      if (boToken) {
        this.logger.log(`BoToken ID: ${boToken.id}`);
        this.logger.log(`BoToken Target Domain: ${boToken.targetDomain}`);
        this.logger.log(`BoToken casUser: ${boToken.casUser}`);
        this.logger.log(`BoToken casPassword: ${boToken.casPassword ? 'exists' : 'null'}`);
        this.logger.log(`BoToken trueSecret: ${boToken.trueSecret ? 'exists' : 'null'}`);
      }
      
      if (!boToken) {
        this.logger.error(`❌ BoToken not found for domain: ${targetDomain}`);
        logTrueMoneyWebhook({
          event: 'DB_QUERY_FAILED',
          error: 'BoToken not found',
          domain: targetDomain,
        });
        return { success: false, message: 'Domain not found' };
      }
      
      const casUser = boToken.casUser;
      const casPassword = boToken.casPassword;
      const trueSecret = boToken.trueSecret;
      
      this.logger.log(`✅ Found BoToken for domain: ${targetDomain}`);
      this.logger.log(`CAS User: ${casUser}`);
      this.logger.log(`True Secret: ${trueSecret ? '***' : 'not set'}`);
      
      logTrueMoneyWebhook({
        event: 'DB_QUERY_SUCCESS',
        domain: targetDomain,
        casUser: casUser,
        hasSecret: !!trueSecret,
      });
      
      // ทดสอบ CAS Login ก่อน
      try {
        this.logger.log('🔐 Attempting CAS login...');
        
        const casApiUrl = getCasApiUrl(targetDomain);
        this.logger.log(`CAS API URL: ${casApiUrl}`);
        
        const loginResponse = await loginToCas({
          casUser: casUser,
          casPassword: casPassword,
          targetDomain: targetDomain
        });
        
        this.logger.log('✅ CAS login successful');
        this.logger.log(`Access token: ${loginResponse.access_token.substring(0, 20)}...`);
        
        logTrueMoneyWebhook({
          event: 'CAS_LOGIN_SUCCESS',
          domain: targetDomain,
          casUser: casUser,
        });
        
      } catch (casError) {
        this.logger.error(`❌ CAS login failed: ${casError.message}`);
        logTrueMoneyWebhook({
          event: 'CAS_LOGIN_FAILED',
          error: casError.message,
          domain: targetDomain,
          casUser: casUser,
        });
        return { success: false, message: `CAS login failed: ${casError.message}` };
      }
      
      // ดึง JWT token จาก body
      let token = webhookData?.message || webhookData?.token;
      
      if (!token && typeof webhookData === 'string') {
        token = webhookData;
      }
      
      this.logger.log(`📝 Token from webhook (FULL): ${token || 'null'}`);
      
      logTrueMoneyWebhook({
        event: 'TOKEN_EXTRACTED',
        token: token || 'null',
        domain: targetDomain,
      });
      
      if (!token || typeof token !== 'string') {
        this.logger.error('❌ No valid token found in webhook data');
        logTrueMoneyWebhook({
          event: 'TOKEN_VALIDATION_FAILED',
          error: 'No valid token found',
          domain: targetDomain,
        });
        return { success: false, message: 'No valid token found' };
      }
      
      // สำหรับการทดสอบเท่านั้น - comment ออกเมื่อ production
      // this.logger.warn('⚠️ No valid token found in webhook data, using test token for development');
      // token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJldmVudF90eXBlIjoiUDJQIiwicmVjZWl2ZWRfdGltZSI6IjIwMjUtMTAtMTFUMDA6MDE6MTkrMDcwMCIsInNlbmRlcl9tb2JpbGUiOiIwODI2NTM2NTg5IiwibWVzc2FnZSI6IiIsImFtb3VudCI6MTAwLCJjaGFubmVsIjoiIiwic2VuZGVyX25hbWUiOiLguJfguKPguIfguIrguLHguKIg4LmA4Lib4LijKioqIiwidHJhbnNhY3Rpb25faWQiOiI1MDA0NjY0OTc2MjYzNiIsImlhdCI6MTc2MDExNTY4MX0.t7-3q14CHeMwr9hmdin9_H6RqIAniibbMwYvIeQ2I2o';
      // this.logger.log(`Using test token: ${token.substring(0, 20)}...`);
      
      // ใช้ trueSecret จาก database เท่านั้น
      if (!trueSecret) {
        this.logger.error('❌ TrueSecret not found in database');
        logTrueMoneyWebhook({
          event: 'SECRET_NOT_FOUND',
          error: 'TrueSecret not configured in database',
          domain: targetDomain,
        });
        return { success: false, message: 'TrueSecret not configured' };
      }
      
      const secret = trueSecret;
      this.logger.log(`Using secret from database: ${secret.substring(0, 10)}...`);
      
      // Verify และ decode JWT token
      const decoded = verifyTrueMoneyToken(token, secret);
      
      if (!decoded) {
        this.logger.error('❌ TrueMoney JWT verification failed');
        logTrueMoneyWebhook({
          event: 'JWT_VERIFICATION_FAILED',
          error: 'Invalid JWT signature or format',
          domain: targetDomain,
          token: token.substring(0, 50) + '...',
        });
        return { success: false, message: 'Invalid JWT token' };
      }
      
      this.logger.log('✅ TrueMoney JWT verified successfully');
      this.logger.log(`Event Type: ${decoded.event_type}`);
      this.logger.log(`Transaction ID: ${decoded.transaction_id}`);
      this.logger.log(`Amount: ${decoded.amount}`);
      this.logger.log(`Sender: ${decoded.sender_name} (${decoded.sender_mobile})`);
      this.logger.log(`Received Time: ${decoded.received_time}`);
      
      // สร้างข้อมูล callback สำหรับ CAS ตามรูปแบบที่ถูกต้อง
      const senderMobile = decoded.sender_mobile || '-';
      const senderName = decoded.sender_name || 'Unknown';
      const senderNameSearch = (decoded.sender_name || 'Unknown').replace(/\*/g, ''); // ลบ * สำหรับ search
      
      // แปลงจากสตางค์เป็นบาท (หาร 100) และเก็บทศนิยม 2 ตำแหน่ง
      const amountInBaht = parseFloat((decoded.amount / 100).toFixed(2));
      
      logTrueMoneyWebhook({
        event: 'JWT_DECODED_SUCCESS',
        domain: targetDomain,
        decoded: {
          event_type: decoded.event_type,
          transaction_id: decoded.transaction_id,
          amount_satang: decoded.amount,
          amount_baht: amountInBaht,
          sender_name: decoded.sender_name,
          sender_mobile: decoded.sender_mobile,
          received_time: decoded.received_time,
        },
      });
      
      const casCallbackData = {
        timestamp: new Date().toISOString(),
        message: `from true wallet #${decoded.transaction_id}`,
        extracted: {
          deposit_source: "TRUE_WALLET",
          amount: amountInBaht,
          bank_account_id: "099",
          bank_account_name: senderName,
          bank_account_name_search: `${senderNameSearch}%`,
          bank_account_number: senderMobile,
          bank_account_number_search: `${senderMobile}%`
        }
      };
      
      // ส่ง callback ไปยัง CAS
      try {
        const casApiUrl = getCasApiUrl(targetDomain);
        const callbackUrl = `${casApiUrl}/deposit/v2/central-notification`; // ตามที่คุณบอก
        
        this.logger.log(`Sending callback to CAS: ${callbackUrl}`);
        
        logTrueMoneyWebhook({
          event: 'SENDING_CAS_CALLBACK',
          domain: targetDomain,
          callbackUrl: callbackUrl,
          callbackData: casCallbackData,
        });
        
        await handleCasCallback({
          casUser: casUser,
          casPassword: casPassword,
          targetDomain: targetDomain
        }, callbackUrl, casCallbackData);
        
        this.logger.log('✅ Callback sent to CAS successfully');
        
        logTrueMoneyWebhook({
          event: 'CAS_CALLBACK_SUCCESS',
          domain: targetDomain,
          transaction_id: decoded.transaction_id,
          amount_baht: amountInBaht,
        });
        
      } catch (casError) {
        this.logger.error(`❌ Failed to send callback to CAS: ${casError.message}`);
        logTrueMoneyWebhook({
          event: 'CAS_CALLBACK_FAILED',
          error: casError.message,
          domain: targetDomain,
          transaction_id: decoded.transaction_id,
        });
        // ไม่ return error เพราะ webhook ยังประมวลผลสำเร็จ
      }
      
    } catch (error) {
      this.logger.error(`❌ Error processing TrueMoney webhook: ${error.message}`);
      logTrueMoneyWebhook({
        event: 'WEBHOOK_PROCESSING_ERROR',
        error: error.message,
        stack: error.stack,
      });
      return { success: false, message: error.message };
    }

    this.logger.log("=== End TrueMoney Webhook (POST) ===");
    logTrueMoneyWebhook({
      event: 'WEBHOOK_COMPLETED',
      status: 'success',
    });
    return { success: true };
  }

  // TrueMoney Webhook - GET Method (Dynamic URL)
  @Get("true-money/:parameter/webhook")
  @HttpCode(200)
  async handleTrueMoneyWebhookGet(
    @Param('parameter') parameter: string,
    @Query() queryParams: any,
    @Req() req: any
  ) {
    this.logger.log("=== TrueMoney Webhook (GET) Received ===");
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
    this.logger.log(`Method: GET`);
    this.logger.log(`URL Parameter: ${parameter}`);
    this.logger.log(`Query Params: ${JSON.stringify(queryParams, null, 2)}`);
    
    try {
      // ดึง JWT token จาก query params
      const token = queryParams.message || queryParams.token;
      
      if (token) {
        // ใช้ parameter เป็น domain เช่น chok369
        const targetDomain = `https://${parameter}.xyz`;
        this.logger.log(`Target Domain from parameter: ${targetDomain}`);
        
        // ดึงข้อมูลจาก database
        const boToken = await prisma.boToken.findFirst({
          where: {
            targetDomain: targetDomain,
            isActive: true
          }
        });
        
        const secret = boToken?.trueSecret || process.env.TRUEMONEY_SECRET || '5ac3229a71af61ea62c5de9bb254c02a';
        const decoded = verifyTrueMoneyToken(token, secret);
        
        if (decoded) {
          this.logger.log('✅ TrueMoney JWT verified');
          this.logger.log(`Transaction ID: ${decoded.transaction_id}`);
          this.logger.log(`Amount: ${decoded.amount}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
    }
    
    this.logger.log("=== End TrueMoney Webhook (GET) ===");
    return;
  }
}
