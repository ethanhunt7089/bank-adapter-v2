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
import axios from "axios";
import {
  handleCasCallback,
  loginToCas,
  validateTargetAccountWithBanks,
} from "../../lib/cas-api-utils";
import { prisma } from "../../lib/prisma";
import { verifyTrueMoneyToken } from "../../lib/true-money-utils";
import { logTrueMoneyWebhook } from "../../lib/winston-logger.config";
import { PaymentService } from "../services/payment.service";

@ApiExcludeController()
@Controller()
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly paymentService: PaymentService) { }

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

  // TrueMoney Webhook - POST Method (Dynamic URL)
  @Post("true-money/:parameter")
  @HttpCode(200)
  async handleTrueMoneyWebhookPostDynamic(
    @Param("parameter") parameter: string,
    @Body() webhookData: any,
    @Req() req: any
  ) {
    this.logger.log("=== TrueMoney Webhook (POST Dynamic) Received ===");
    this.logger.log(`Timestamp: ${new Date().toISOString()}`);
    this.logger.log(`Method: POST`);
    this.logger.log(`URL Parameter: ${parameter}`);
    this.logger.log(`Raw Data: ${JSON.stringify(webhookData, null, 2)}`);


    // คำนวณ targetDomain ก่อนเข้า try เพื่อให้เข้าถึงได้ใน catch และส่วนท้ายของฟังก์ชัน
    const forwardedProto = req.headers["x-forwarded-proto"];
    const protocol =
      forwardedProto ||
      req.protocol ||
      process.env.DEFAULT_PROTOCOL ||
      "https"; // 'http' หรือ 'https'
    const hostname = req.hostname; // 'bank.mu288.live'
    const originalUrl = req.originalUrl; // '/true-money/mxjapegoabvmjo1t'
    const targetDomain = `https://${hostname}${originalUrl}`;
    let casResult: any = null; // สำหรับเก็บค่าที่จะส่งกลับใน HTTP Response

    try {
      // Log to file (Moved here to include targetDomain)
      logTrueMoneyWebhook({
        event: "WEBHOOK_RECEIVED_DYNAMIC",
        method: "POST",
        parameter: parameter,
        rawData: webhookData,
        domain: targetDomain, // เพิ่ม domain เพื่อให้ Filter เจอตั้งแต่จุดแรก
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`All Headers: ${JSON.stringify(req.headers, null, 2)}`);
      this.logger.log(`Forwarded Proto: ${forwardedProto}`);
      this.logger.log(`Final Protocol: ${protocol}`);

      this.logger.log(`Parameter: ${parameter}`);
      this.logger.log(`Protocol: ${protocol}`);
      this.logger.log(`Hostname: ${hostname}`);
      this.logger.log(`Original URL: ${originalUrl}`);
      this.logger.log(`Target Domain: ${targetDomain}`);

      // ดึงข้อมูลจาก bo_webhook - เชื่อมโยงกับ bo_token
      let boWebhook = await prisma.boWebhook.findFirst({
        where: {
          targetDomain: targetDomain,
        },
        include: {
          boToken: true,
        },
      });

      this.logger.log(`Query result: ${boWebhook ? "Found" : "Not found"}`);
      if (boWebhook) {
        this.logger.log(`BoWebhook ID: ${boWebhook.id}`);
        this.logger.log(`BoToken ID: ${boWebhook.boToken.id}`);
        this.logger.log(`BoWebhook Target Domain: ${boWebhook.targetDomain}`);
        this.logger.log(`BoToken casUser: ${boWebhook.boToken.casUser}`);
        this.logger.log(
          `BoToken casPassword: ${boWebhook.boToken.casPassword ? "exists" : "null"}`
        );
        this.logger.log(
          `BoWebhook trueSecret: ${boWebhook.trueSecret ? "exists" : "null"}`
        );
      }

      if (!boWebhook || !boWebhook.boToken.isActive) {
        this.logger.error(`❌ ไม่พบข้อมูล webhook หรือ บัญชีถูกปิดใช้งาน สำหรับ: ${targetDomain}`);
        logTrueMoneyWebhook({
          event: "DB_QUERY_FAILED",
          error: "BoWebhook not found or BoToken inactive",
          domain: targetDomain,
        });
        // ส่ง response data แต่ยังคง status 200
        return {
          success: false,
          message:
            "ไม่พบการตั้งค่า TrueMoney Webhook หรือบัญชีถูกปิดใช้งานสำหรับ domain นี้",
          targetDomain: targetDomain,
        };
      } else {
        const boToken = boWebhook.boToken; // ให้โค้ดเดิมที่ใช้ boToken.xxx ยังทำงานได้
        const casUser = boToken.casUser;
        const casPassword = boToken.casPassword;
        const trueSecret = boWebhook.trueSecret; // ดึงจาก webhook (detail)
        const casApiBase = boWebhook.casApiBase; // ดึงจาก webhook (detail)
        const targetAccNum = boWebhook.targetAccNum; // ดึงจาก webhook (detail)

        this.logger.log(`✅ Found BoToken for domain: ${targetDomain}`);
        this.logger.log(`CAS User: ${casUser}`);
        this.logger.log(`CAS API Base: ${casApiBase}`);
        this.logger.log(`True Secret: ${trueSecret ? "***" : "not set"}`);

        logTrueMoneyWebhook({
          event: "DB_QUERY_SUCCESS",
          domain: targetDomain,
          casUser: casUser,
          casApiBase: casApiBase,
          hasSecret: !!trueSecret,
        });

        // Login CAS
        let loginResponse;
        try {
          this.logger.log("🔐 Attempting CAS login...");

          // ใช้ casApiBase จาก database แทนการสร้าง URL เอง
          const casApiUrl = casApiBase;
          this.logger.log(`CAS API URL: ${casApiUrl}`);

          loginResponse = await loginToCas({
            casUser: casUser,
            casPassword: casPassword,
            casApiBase: casApiUrl, // ส่ง casApiBase ไปแทน targetDomain
          });

          this.logger.log("✅ CAS login successful");
          this.logger.log(
            `Access token: ${loginResponse.access_token.substring(0, 20)}...`
          );

          logTrueMoneyWebhook({
            event: "CAS_LOGIN_SUCCESS",
            domain: targetDomain,
            casUser: casUser,
          });
        } catch (casError) {
          this.logger.error(`❌ CAS login failed: ${casError.message}`);

          // Log ละเอียดเพิ่มเติม
          const errorDetails: any = {
            event: "CAS_LOGIN_FAILED",
            error: casError.message,
            casApiBase: casApiBase,
            casUser: casUser,
            domain: targetDomain, // เพิ่มโดเมนเพื่อให้ Log ต่อเนื่องกัน
          };

          // ดึงข้อมูล error จาก CAS ที่เก็บไว้ใน error object
          if (
            casError &&
            typeof casError === "object" &&
            "casError" in casError
          ) {
            const casErrorData = (casError as any).casError;
            if (casErrorData.status) {
              // Error จาก CAS response
              errorDetails.status = casErrorData.status;
              errorDetails.statusText = casErrorData.statusText;
              errorDetails.responseData = casErrorData.responseData;
            } else if (casErrorData.errorCode) {
              // Error จาก CAS request (unreachable)
              errorDetails.errorCode = casErrorData.errorCode;
              errorDetails.isTimeout = casErrorData.isTimeout;
              errorDetails.loginUrl = `${casApiBase}/admin/login`;
              errorDetails.errorType = "CONNECTION_ERROR";
            }
          }

          // เพิ่มข้อมูล error ถ้าเป็น Axios error (fallback)
          if (axios.isAxiosError(casError)) {
            if (casError.response) {
              errorDetails.status = casError.response.status;
              errorDetails.statusText = casError.response.statusText;
              errorDetails.responseData = casError.response.data;
            } else if (casError.request) {
              errorDetails.errorCode = casError.code;
              errorDetails.isTimeout = casError.code === "ECONNABORTED";
            }
          }

          // เพิ่มข้อมูลเพิ่มเติมถ้า error message บอกว่า unreachable
          if (
            casError.message &&
            casError.message.includes("unreachable") &&
            !errorDetails.loginUrl
          ) {
            errorDetails.loginUrl = `${casApiBase}/admin/login`;
            errorDetails.errorType = "CONNECTION_ERROR";
          }

          logTrueMoneyWebhook(errorDetails);
          // ส่ง response data แต่ยังคง status 200
          return {
            success: false,
            message: "CAS login ล้มเหลว",
            error: casError.message,
          };
        }

        // ดึง JWT token จาก body
        let token = webhookData?.message || webhookData?.token;

        if (!token && typeof webhookData === "string") {
          token = webhookData;
        }

        this.logger.log(`📝 Token from webhook (FULL): ${token || "null"}`);

        logTrueMoneyWebhook({
          event: "TOKEN_EXTRACTED",
          token: token || "null",
          domain: targetDomain,
        });

        if (!token || typeof token !== "string") {
          this.logger.error("❌ No valid token found in webhook data");
          logTrueMoneyWebhook({
            event: "TOKEN_VALIDATION_FAILED",
            error: "No valid token found",
            domain: targetDomain,
          });
          // ส่ง response data แต่ยังคง status 200
          return {
            success: false,
            message: "ไม่พบ JWT token",
            targetDomain: targetDomain,
          };
        } else if (!trueSecret) {
          this.logger.error("❌ TrueSecret not found in database");
          logTrueMoneyWebhook({
            event: "SECRET_NOT_FOUND",
            error: "TrueSecret not configured in database",
            domain: targetDomain,
          });
          // ส่ง response data แต่ยังคง status 200
          return {
            success: false,
            message: "ไม่พบ TrueSecret ใน database",
            targetDomain: targetDomain,
          };
        } else {
          const secret = trueSecret;
          this.logger.log(
            `Using secret from database: ${secret.substring(0, 10)}...`
          );

          // Verify และ decode JWT token
          const decoded = verifyTrueMoneyToken(token, secret);

          if (!decoded) {
            this.logger.error("❌ TrueMoney JWT verification failed");
            logTrueMoneyWebhook({
              event: "JWT_VERIFICATION_FAILED",
              error: "Invalid JWT signature or format",
              domain: targetDomain,
              token: token.substring(0, 50) + "...",
            });
            // ส่ง response data แต่ยังคง status 200
            return {
              success: false,
              message: "JWT token ไม่ถูกต้อง",
              targetDomain: targetDomain,
            };
          } else {
            this.logger.log("✅ TrueMoney JWT verified successfully");
            this.logger.log(`Event Type: ${decoded.event_type}`);
            this.logger.log(`Transaction ID: ${decoded.transaction_id}`);
            this.logger.log(`Amount: ${decoded.amount}`);
            this.logger.log(
              `Sender: ${decoded.sender_name} (${decoded.sender_mobile})`
            );
            this.logger.log(`Received Time: ${decoded.received_time}`);

            // สร้างข้อมูล callback สำหรับ CAS ตามรูปแบบที่ถูกต้อง
            const senderMobile = decoded.sender_mobile || "-";
            const senderName = decoded.sender_name || "Unknown";
            const senderNameSearch = (decoded.sender_name || "Unknown").replace(
              /\*/g,
              ""
            ); // ลบ * สำหรับ search

            // แปลงจากสตางค์เป็นบาท (หาร 100) และเก็บทศนิยม 2 ตำแหน่ง
            const amountInBaht = parseFloat((decoded.amount / 100).toFixed(2));

            logTrueMoneyWebhook({
              event: "JWT_DECODED_SUCCESS",
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
              message: `from true wallet webhook #${decoded.transaction_id}`,
              extracted: {
                deposit_source: "TRUE_WALLET",
                amount: amountInBaht,
                bank_account_id: "099",
                bank_account_name: senderName,
                bank_account_name_search: `${senderNameSearch}%`,
                bank_account_number: senderMobile,
                bank_account_number_search: `${senderMobile}%`,
                cas_bank_account_number: targetAccNum,
                cas_bank_account_number_search: `${targetAccNum}%`,
              },
            };

            // ตรวจสอบ target account กับ CAS banks API ก่อนส่ง callback
            if (!targetAccNum) {
              this.logger.error(
                `❌ Target account number not configured for domain: ${targetDomain}`
              );
              logTrueMoneyWebhook({
                event: "TARGET_ACCOUNT_NOT_CONFIGURED",
                error: "Target account number not configured",
                domain: targetDomain,
              });
              return {
                success: false,
                message: "Target account number not configured",
              };
            }

            // ตรวจสอบ target account กับ CAS banks API
            try {
              this.logger.log(
                `🔍 Validating target account ${targetAccNum} with CAS banks API`
              );

              logTrueMoneyWebhook({
                event: "STARTING_TARGET_ACCOUNT_VALIDATION",
                target_account: targetAccNum,
                domain: targetDomain,
                casApiBase: casApiBase,
              });

              const validation = await validateTargetAccountWithBanks(
                casApiBase, // ส่ง casApiBase โดยตรงแทน targetDomain
                loginResponse.access_token,
                targetAccNum
              );

              if (!validation.isValid) {
                this.logger.error(
                  `❌ Target account validation failed: ${validation.message}`
                );
                logTrueMoneyWebhook({
                  event: "TARGET_ACCOUNT_VALIDATION_FAILED",
                  error: validation.message,
                  target_account: targetAccNum,
                  domain: targetDomain,
                });
                return { success: false, message: validation.message };
              }

              this.logger.log(
                `✅ Target account ${targetAccNum} validated successfully`
              );
              logTrueMoneyWebhook({
                event: "TARGET_ACCOUNT_VALIDATION_SUCCESS",
                target_account: targetAccNum,
                bank_info: validation.bankInfo,
                domain: targetDomain,
              });
            } catch (validationError) {
              this.logger.error(
                `❌ Target account validation error: ${validationError.message}`
              );
              logTrueMoneyWebhook({
                event: "TARGET_ACCOUNT_VALIDATION_ERROR",
                error: validationError.message,
                target_account: targetAccNum,
                domain: targetDomain,
              });
              return {
                success: false,
                message: `Target account validation error: ${validationError.message}`,
              };
            }

            // ส่ง callback ไปยัง CAS
            // ใช้ casApiBase จาก database แทนการสร้าง URL เอง
            const casApiUrl = casApiBase;
            const callbackUrl = `${casApiUrl}/deposit/v2/central-notification`;

            try {
              this.logger.log(`Sending callback to CAS: ${callbackUrl}`);

              logTrueMoneyWebhook({
                event: "SENDING_CAS_CALLBACK",
                domain: targetDomain,
                casApiBase: casApiBase,
                callbackUrl: callbackUrl,
                callbackData: casCallbackData,
              });

              const casResponse = await handleCasCallback(
                {
                  casUser: casUser,
                  casPassword: casPassword,
                  casApiBase: casApiUrl, // ส่ง casApiBase ไปแทน targetDomain
                },
                callbackUrl,
                casCallbackData
              );

              this.logger.log("✅ Callback sent to CAS successfully");

              logTrueMoneyWebhook({
                event: "CAS_CALLBACK_SUCCESS",
                domain: targetDomain,
                transaction_id: decoded.transaction_id,
                amount_baht: amountInBaht,
                cas_response: casResponse, // เพิ่ม response จาก CAS
              });

              casResult = casResponse; // เก็บผลลัพธ์เพื่อส่งกลับใน HTTP Response
            } catch (casError) {
              this.logger.error(
                `❌ Failed to send callback to CAS: ${casError.message}`
              );

              // Log ละเอียดเพิ่มเติม
              const errorDetails: any = {
                event: "CAS_CALLBACK_FAILED",
                error: casError.message,
                transaction_id: decoded.transaction_id,
                amount_baht: amountInBaht,
                casApiBase: casApiBase,
                callbackUrl: callbackUrl,
                casUser: casUser,
                payload: casCallbackData,
                domain: targetDomain, // เพิ่มโดเมนเพื่อนให้ Log ต่อเนื่องกัน
              };

              // ดึงข้อมูล error จาก CAS ที่เก็บไว้ใน error object
              if (
                casError &&
                typeof casError === "object" &&
                "casError" in casError
              ) {
                const casErrorData = (casError as any).casError;
                if (casErrorData.status) {
                  // Error จาก CAS response
                  errorDetails.status = casErrorData.status;
                  errorDetails.statusText = casErrorData.statusText;
                  errorDetails.responseData = casErrorData.responseData;
                } else if (casErrorData.errorCode) {
                  // Error จาก CAS request (unreachable)
                  errorDetails.errorCode = casErrorData.errorCode;
                  errorDetails.isTimeout = casErrorData.isTimeout;
                  errorDetails.loginUrl = `${casApiBase}/admin/login`;
                  errorDetails.errorType = "CONNECTION_ERROR";
                }
              }

              // เพิ่มข้อมูล error ถ้าเป็น Axios error (fallback)
              if (axios.isAxiosError(casError)) {
                if (casError.response) {
                  errorDetails.status = casError.response.status;
                  errorDetails.statusText = casError.response.statusText;
                  errorDetails.responseData = casError.response.data;
                } else if (casError.request) {
                  errorDetails.errorCode = casError.code;
                  errorDetails.isTimeout = casError.code === "ECONNABORTED";
                }
              }

              // เพิ่มข้อมูลเพิ่มเติมถ้า error message บอกว่า unreachable
              if (
                casError.message &&
                casError.message.includes("unreachable") &&
                !errorDetails.loginUrl
              ) {
                errorDetails.loginUrl = `${casApiBase}/admin/login`;
                errorDetails.errorType = "CONNECTION_ERROR";
              }

              logTrueMoneyWebhook(errorDetails);
              casResult = { error: casError.message, details: errorDetails }; // เก็บข้อมูล Error

              // ไม่ return error เพราะ webhook ยังประมวลผลสำเร็จ
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `❌ Error processing TrueMoney webhook: ${error.message}`
      );
      logTrueMoneyWebhook({
        event: "WEBHOOK_PROCESSING_ERROR",
        error: error.message,
        stack: error.stack,
        domain: targetDomain,
      });
      // ส่ง response data แต่ยังคง status 200
      return {
        success: false,
        message: "เกิดข้อผิดพลาด",
        error: error.message,
      };
    }

    this.logger.log("=== End TrueMoney Webhook (POST Dynamic) ===");
    logTrueMoneyWebhook({
      event: "WEBHOOK_COMPLETED",
      status: "completed",
      domain: targetDomain,
    });
    // ส่ง response data สำเร็จ แต่ยังคง status 200
    return {
      success: true,
      message: "Webhook processed successfully",
      casResult: casResult, // เพิ่มผลลัพธ์จาก CAS กลับไปให้ผู้เรียก
      timestamp: new Date().toISOString(),
    };
  }

  // TrueMoney Webhook - GET Method (Dynamic URL)
  @Get("true-money/:parameter/webhook")
  @HttpCode(200)
  async handleTrueMoneyWebhookGetDynamic(
    @Param("parameter") parameter: string,
    @Query() queryParams: any,
    @Req() req: any
  ) {
    this.logger.log("=== TrueMoney Webhook (GET Dynamic) Received ===");
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
        const boWebhook = await prisma.boWebhook.findFirst({
          where: {
            targetDomain: targetDomain,
          },
          include: {
            boToken: true,
          }
        });

        const secret =
          (boWebhook && boWebhook.boToken.isActive ? boWebhook.trueSecret : null) ||
          process.env.TRUEMONEY_SECRET ||
          "5ac3229a71af61ea62c5de9bb254c02a";
        const decoded = verifyTrueMoneyToken(token, secret);

        if (decoded) {
          this.logger.log("✅ TrueMoney JWT verified");
          this.logger.log(`Transaction ID: ${decoded.transaction_id}`);
          this.logger.log(`Amount: ${decoded.amount}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
    }

    this.logger.log("=== End TrueMoney Webhook (GET Dynamic) ===");
    return;
  }
}
