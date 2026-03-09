import axios from "axios";
import { logTrueMoneyWebhook } from "./winston-logger.config";

export interface CasLoginRequest {
  username: string;
  password: string;
}

export interface CasLoginResponse {
  access_token: string;
  profile: {
    id: number;
    username: string;
    role: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_two_factor_enabled: boolean;
  };
}

export interface CasApiConfig {
  casUser: string;
  casPassword: string;
  targetDomain?: string; // เช่น https://chok369.xyz (optional)
  casApiBase?: string; // เช่น https://cas.chok369.xyz (ใช้แทน targetDomain)
}

// Token Cache Entry
interface TokenCacheEntry {
  token: string;
  casApiBase: string;
  casUser: string;
  lastUsed: Date;
}

// Flyweight Pattern: แชร์ string instances ที่เหมือนกัน
class StringFlyweight {
  private static instances = new Map<string, string>();

  static get(value: string): string {
    if (!this.instances.has(value)) {
      this.instances.set(value, value);
    }
    return this.instances.get(value)!;
  }

  static clear(): void {
    this.instances.clear();
  }
}

// Singleton Pattern: Token Cache Manager
class TokenCacheManager {
  private static instance: TokenCacheManager;
  private cache: Map<string, TokenCacheEntry>;

  private constructor() {
    this.cache = new Map<string, TokenCacheEntry>();
  }

  static getInstance(): TokenCacheManager {
    if (!TokenCacheManager.instance) {
      TokenCacheManager.instance = new TokenCacheManager();
    }
    return TokenCacheManager.instance;
  }

  /**
   * สร้าง cache key จาก casApiBase และ casUser (ใช้ Flyweight)
   */
  private getCacheKey(casApiBase: string, casUser: string): string {
    const base = StringFlyweight.get(casApiBase);
    const user = StringFlyweight.get(casUser);
    return `${base}:${user}`;
  }

  /**
   * ตรวจสอบว่า token มีอยู่ใน cache หรือไม่
   */
  get(casApiBase: string, casUser: string): TokenCacheEntry | undefined {
    const key = this.getCacheKey(casApiBase, casUser);
    const entry = this.cache.get(key);
    if (entry) {
      entry.lastUsed = new Date();
    }
    return entry;
  }

  /**
   * เก็บ token ใน cache (ใช้ Flyweight สำหรับ string)
   */
  set(casApiBase: string, casUser: string, token: string): void {
    const key = this.getCacheKey(casApiBase, casUser);
    this.cache.set(key, {
      token: token,
      casApiBase: StringFlyweight.get(casApiBase),
      casUser: StringFlyweight.get(casUser),
      lastUsed: new Date(),
    });
    console.log(`💾 Cached token for: ${key}`);
  }

  /**
   * ลบ token จาก cache
   */
  delete(casApiBase: string, casUser: string): void {
    const key = this.getCacheKey(casApiBase, casUser);
    this.cache.delete(key);
    console.log(`🗑️ Cleared token cache for: ${key}`);
  }

  /**
   * ลบ token ทั้งหมด
   */
  clear(): void {
    this.cache.clear();
    console.log(`🗑️ Cleared all token cache`);
  }

  /**
   * ตรวจสอบว่า response status เป็น authentication error หรือไม่
   */
  static isAuthError(status: number): boolean {
    return status === 401 || status === 403;
  }
}

/**
 * แปลง domain จาก https://chok369.xyz เป็น https://cas.chok369.xyz
 * @param targetDomain - Domain ต้นทาง เช่น https://chok369.xyz
 * @returns CAS API URL เช่น https://cas.chok369.xyz
 */
export function getCasApiUrl(targetDomain: string): string {
  try {
    const url = new URL(targetDomain);
    const hostname = url.hostname; // chok369.xyz

    // แยก domain หลัก
    const domainParts = hostname.split(".");
    const mainDomain = domainParts.slice(-2).join("."); // chok369.xyz

    // สร้าง CAS URL
    const casUrl = `${url.protocol}//cas.${mainDomain}`;

    return casUrl;
  } catch (error) {
    throw new Error(`Invalid target domain: ${targetDomain}`);
  }
}

/**
 * Login ไปที่ CAS API และรับ access_token (with caching)
 * @param config - ข้อมูลสำหรับ login
 * @param forceRefresh - บังคับให้ login ใหม่ (ไม่ใช้ cache)
 * @returns access_token และ profile
 */
export async function loginToCas(
  config: CasApiConfig,
  forceRefresh: boolean = false
): Promise<CasLoginResponse> {
  // ใช้ casApiBase ถ้ามี ถ้าไม่มีจึงใช้ targetDomain
  const casApiUrl = config.casApiBase || getCasApiUrl(config.targetDomain);
  const cacheManager = TokenCacheManager.getInstance();

  // ตรวจสอบ cache (ถ้าไม่บังคับ refresh)
  if (!forceRefresh) {
    const cached = cacheManager.get(casApiUrl, config.casUser);
    if (cached) {
      console.log(`✅ Using cached token for: ${casApiUrl}:${config.casUser}`);

      // Log ไปที่ Winston Logger
      logTrueMoneyWebhook({
        event: "CAS_TOKEN_CACHED_USED",
        casApiBase: casApiUrl,
        casUser: config.casUser,
        tokenPrefix: cached.token.substring(0, 20) + "...",
        lastUsed: cached.lastUsed.toISOString(),
        message: "Using cached token instead of new login",
      });

      return {
        access_token: cached.token,
        profile: {} as any, // ไม่ต้องใช้ profile จาก cache
      };
    }
  }

  // Login ใหม่
  const loginUrl = `${casApiUrl}/admin/login`;

  try {
    const loginData: CasLoginRequest = {
      username: config.casUser,
      password: config.casPassword,
    };

    console.log(`Attempting CAS login to: ${loginUrl}`);
    console.log(`Username: ${config.casUser}`);

    const response = await axios.post<CasLoginResponse>(loginUrl, loginData, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Bank-Adapter-v2/1.0",
      },
      timeout: 30000, // 30 seconds timeout
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`CAS login failed with status: ${response.status}`);
    }

    console.log(`✅ CAS login successful for ${config.casUser}`);
    console.log(
      `Access token: ${response.data.access_token.substring(0, 20)}...`
    );

    // เก็บ token ใน cache
    cacheManager.set(casApiUrl, config.casUser, response.data.access_token);

    return response.data;
  } catch (error) {
    console.error(`❌ CAS login failed:`, error.message);

    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        console.error(
          `Server error: ${error.response.status} - ${error.response.statusText}`
        );
        console.error(`Response data:`, error.response.data);

        // Log ละเอียด
        logTrueMoneyWebhook({
          event: "CAS_LOGIN_ERROR_RESPONSE",
          error: error.message,
          status: error.response.status,
          statusText: error.response.statusText,
          responseData: error.response.data,
          responseHeaders: error.response.headers,
          loginUrl: loginUrl,
          casUser: config.casUser,
          casApiBase: config.casApiBase,
          targetDomain: config.targetDomain,
        });

        const casError = new Error(
          `CAS API error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`
        );
        // เก็บข้อมูล error จาก CAS ไว้ใน error object
        (casError as any).casError = {
          status: error.response.status,
          statusText: error.response.statusText,
          responseData: error.response.data,
          responseHeaders: error.response.headers,
        };
        throw casError;
      } else if (error.request) {
        // Request was made but no response received
        console.error(`No response received from CAS API`);
        console.error(`Request URL: ${loginUrl}`);
        console.error(`Request method: POST`);
        console.error(
          `Request timeout: ${error.code === "ECONNABORTED" ? "Yes" : "No"}`
        );
        console.error(`Error code: ${error.code || "N/A"}`);
        console.error(`Error message: ${error.message}`);

        // Log ละเอียด
        logTrueMoneyWebhook({
          event: "CAS_LOGIN_UNREACHABLE",
          error: error.message,
          errorCode: error.code,
          loginUrl: loginUrl,
          casUser: config.casUser,
          casApiBase: config.casApiBase,
          targetDomain: config.targetDomain,
          isTimeout: error.code === "ECONNABORTED",
          requestConfig: {
            timeout: 30000,
            method: "POST",
            url: loginUrl,
          },
        });

        const casError = new Error("CAS API unreachable");
        // เก็บข้อมูล error จาก CAS ไว้ใน error object
        (casError as any).casError = {
          errorCode: error.code,
          isTimeout: error.code === "ECONNABORTED",
          requestUrl: loginUrl,
        };
        throw casError;
      }
    }

    // Log error อื่นๆ
    logTrueMoneyWebhook({
      event: "CAS_LOGIN_ERROR",
      error: error.message,
      errorStack: error.stack,
      loginUrl: loginUrl,
      casUser: config.casUser,
      casApiBase: config.casApiBase,
      targetDomain: config.targetDomain,
    });

    throw error;
  }
}

/**
 * ส่ง callback ไปยัง CAS API ด้วย access_token
 * @param callbackUrl - URL ที่จะส่ง callback ไป
 * @param callbackData - ข้อมูลที่จะส่ง
 * @param accessToken - access_token จาก CAS login
 */
export async function sendCallbackToCas(
  callbackUrl: string,
  callbackData: any,
  accessToken: string
): Promise<void> {
  try {
    console.log(`Sending callback to CAS: ${callbackUrl}`);
    console.log(`Callback data:`, JSON.stringify(callbackData, null, 2));

    // ส่งข้อมูลไปโดยไม่รอ response (fire and forget)
    axios
      .post(callbackUrl, callbackData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "Bank-Adapter-v2/1.0",
        },
        timeout: 30000, // 30 seconds timeout
      })
      .then((response) => {
        console.log(
          `✅ Callback sent successfully to CAS, Status: ${response.status}`
        );

        // Log response จาก CAS เข้า log file
        logTrueMoneyWebhook({
          event: "CAS_CALLBACK_RESPONSE",
          status: response.status,
          statusText: response.statusText,
          responseData: response.data,
          responseHeaders: response.headers,
          callbackUrl: callbackUrl,
        });
      })
      .catch((error) => {
        console.error(`❌ Failed to send callback to CAS:`, error.message);

        // Log error response จาก CAS เข้า log file
        if (axios.isAxiosError(error)) {
          if (error.response) {
            console.error(
              `Server error: ${error.response.status} - ${error.response.statusText}`
            );
            console.error(`Response data:`, error.response.data);

            logTrueMoneyWebhook({
              event: "CAS_CALLBACK_ERROR_RESPONSE",
              error: error.message,
              status: error.response.status,
              statusText: error.response.statusText,
              responseData: error.response.data,
              responseHeaders: error.response.headers,
              callbackUrl: callbackUrl,
              payload: callbackData,
            });
          } else {
            logTrueMoneyWebhook({
              event: "CAS_CALLBACK_ERROR",
              error: error.message,
              errorCode: error.code,
              callbackUrl: callbackUrl,
              payload: callbackData,
              isTimeout: error.code === "ECONNABORTED",
            });
          }
        } else {
          logTrueMoneyWebhook({
            event: "CAS_CALLBACK_ERROR",
            error: error.message,
            callbackUrl: callbackUrl,
            payload: callbackData,
          });
        }
      });

    console.log(`📤 Callback request sent to CAS (fire and forget)`);
  } catch (error) {
    console.error(`❌ Failed to send callback to CAS:`, error.message);
    // ไม่ throw error เพราะไม่ต้องการให้ webhook ล้มเหลว
  }
}

/**
 * ส่ง callback ไปยัง CAS API และรอ response (สำหรับตรวจสอบ token)
 * @param callbackUrl - URL ที่จะส่ง callback ไป
 * @param callbackData - ข้อมูลที่จะส่ง
 * @param accessToken - access_token จาก CAS login
 * @returns response จาก CAS
 */
async function sendCallbackToCasWithResponse(
  callbackUrl: string,
  callbackData: any,
  accessToken: string
): Promise<any> {
  const response = await axios.post(callbackUrl, callbackData, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "Bank-Adapter-v2/1.0",
    },
    timeout: 30000, // 30 seconds timeout
  });

  return response;
}

/**
 * Helper function สำหรับใช้งาน CAS API แบบครบวงจร (with retry on auth error)
 * @param config - ข้อมูลสำหรับ login
 * @param callbackUrl - URL ที่จะส่ง callback ไป
 * @param callbackData - ข้อมูลที่จะส่ง
 * @param retryCount - จำนวนครั้งที่ retry แล้ว (default: 0)
 */
export async function handleCasCallback(
  config: CasApiConfig,
  callbackUrl: string,
  callbackData: any,
  retryCount: number = 0,
  metadata?: { requestId?: string; domain?: string }
): Promise<any> {
  const maxRetries = 1; // Retry 1 ครั้งเท่านั้น
  const cacheManager = TokenCacheManager.getInstance();

  try {
    // 1. Login เพื่อเอา access_token (ใช้ cache ถ้ามี)
    const loginResponse = await loginToCas(config, retryCount > 0);
    const accessToken = loginResponse.access_token;

    // 2. ส่ง callback ไปยัง CAS (รอ response เพื่อตรวจสอบ token)
    try {
      const response = await sendCallbackToCasWithResponse(
        callbackUrl,
        callbackData,
        accessToken
      );

      console.log(
        `✅ Callback sent successfully to CAS, Status: ${response.status}`
      );

      // Log response จาก CAS เข้า log file
      logTrueMoneyWebhook({
        event: "CAS_CALLBACK_RESPONSE",
        status: response.status,
        statusText: response.statusText,
        responseData: response.data,
        responseHeaders: response.headers,
        callbackUrl: callbackUrl,
        ...metadata,
      });

      console.log(`✅ CAS callback completed successfully`);
      return response.data; // ส่ง response data กลับเพื่อ log ใน caller
    } catch (callbackError) {
      // ตรวจสอบว่าเป็น auth error หรือไม่
      if (
        axios.isAxiosError(callbackError) &&
        callbackError.response &&
        TokenCacheManager.isAuthError(callbackError.response.status) &&
        retryCount < maxRetries
      ) {
        // Token ใช้ไม่ได้ → clear cache → login ใหม่ → retry
        const casApiUrl =
          config.casApiBase || getCasApiUrl(config.targetDomain);
        cacheManager.delete(casApiUrl, config.casUser);

        console.log(
          `🔄 Token invalid (${callbackError.response.status}), retrying with new token...`
        );

        // Retry ด้วย token ใหม่
        return handleCasCallback(
          config,
          callbackUrl,
          callbackData,
          retryCount + 1,
          metadata
        );
      }

      // Error อื่นๆ หรือ retry หมดแล้ว → throw error
      throw callbackError;
    }
  } catch (error) {
    console.error(`❌ CAS callback failed:`, error.message);

    // Log ละเอียดเมื่อเกิด error
    if (axios.isAxiosError(error)) {
      if (error.response) {
        logTrueMoneyWebhook({
          event: "CAS_CALLBACK_HANDLER_ERROR_RESPONSE",
          error: error.message,
          status: error.response.status,
          statusText: error.response.statusText,
          responseData: error.response.data,
          responseHeaders: error.response.headers,
          callbackUrl: callbackUrl,
          casUser: config.casUser,
          casApiBase: config.casApiBase,
          targetDomain: config.targetDomain,
          ...metadata,
        });
      } else if (error.request) {
        logTrueMoneyWebhook({
          event: "CAS_CALLBACK_HANDLER_UNREACHABLE",
          error: error.message,
          errorCode: error.code,
          callbackUrl: callbackUrl,
          casUser: config.casUser,
          casApiBase: config.casApiBase,
          targetDomain: config.targetDomain,
          isTimeout: error.code === "ECONNABORTED",
          requestConfig: {
            timeout: 30000,
            method: "POST",
            url: callbackUrl,
          },
          ...metadata,
        });
      } else {
        logTrueMoneyWebhook({
          event: "CAS_CALLBACK_HANDLER_ERROR",
          error: error.message,
          errorStack: error.stack,
          callbackUrl: callbackUrl,
          casUser: config.casUser,
          casApiBase: config.casApiBase,
          targetDomain: config.targetDomain,
          ...metadata,
        });
      }
    } else {
      logTrueMoneyWebhook({
        event: "CAS_CALLBACK_HANDLER_ERROR",
        error: error.message,
        errorStack: error.stack,
        callbackUrl: callbackUrl,
        casUser: config.casUser,
        casApiBase: config.casApiBase,
        targetDomain: config.targetDomain,
      });
    }

    throw error;
  }
}

/**
 * ตรวจสอบ target account number กับ CAS API /banks
 * @param targetDomain - Domain ของ CAS API
 * @param accessToken - access_token จาก CAS login
 * @param targetAccNum - หมายเลขบัญชีที่ต้องการตรวจสอบ
 * @returns true ถ้าพบบัญชี, false ถ้าไม่พบ
 */
export async function validateTargetAccountWithBanks(
  casApiUrl: string, // รับ CAS API URL โดยตรง
  accessToken: string,
  targetAccNum: string,
  metadata?: { requestId?: string; domain?: string }
): Promise<{ isValid: boolean; bankInfo?: any; message?: string }> {
  try {
    const banksUrl = `${casApiUrl}/banks`;

    console.log(
      `🔍 Validating target account ${targetAccNum} with CAS banks API`
    );
    console.log(`Banks API URL: ${banksUrl}`);

    const response = await axios.get(banksUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Bank-Adapter-v2/1.0",
      },
      timeout: 30000, // 10 seconds timeout
    });

    if (response.status !== 200) {
      return {
        isValid: false,
        message: `Banks API returned status: ${response.status}`,
      };
    }

    const banksResponse = response.data;
    const banks = banksResponse.data || banksResponse; // รองรับทั้ง {data: [...]} และ [...]

    // ตรวจสอบว่า banks เป็น array หรือไม่
    if (!Array.isArray(banks)) {
      console.error(`❌ Banks data is not an array:`, typeof banks);
      return {
        isValid: false,
        message: "Invalid banks data format",
      };
    }

    console.log(`📊 Received ${banks.length} banks from CAS`);

    // --- LOG ข้อมูลบัญชีทั้งหมดเพื่อตรวจสอบ ---
    const bankSummary = banks.map((b: any, index: number) => ({
      index: index + 1,
      acc_no: b.account_number || b.account_no, // รองรับทั้ง account_number และ account_no
      phone: b.phone_number,
      is_dep: b.is_enable_deposit,
      is_show: b.is_show,
      bank_code: b.bank_code
    }));
    console.log(`🔍 Target Account to match: "${targetAccNum}"`);
    console.log(`🏦 CAS Bank List Detail:`, JSON.stringify(bankSummary, null, 2));
    // ---------------------------------------

    // ลบอักขระที่ไม่ใช่ตัวเลขออกก่อนเทียบ (เช่น ขีด, ช่องว่าง)
    const cleanTarget = targetAccNum.replace(/\D/g, '');

    const foundBank = banks.find((bank: any) => {
      const cleanPhone = (bank.phone_number || '').replace(/\D/g, '');
      const cleanAcc = (bank.account_number || bank.account_no || '').replace(/\D/g, '');

      return (cleanPhone === cleanTarget || cleanAcc === cleanTarget) &&
        bank.is_enable_deposit === true;
    });

    if (foundBank) {
      console.log(`✅ Found target account ${targetAccNum} in CAS banks (Matched: ${foundBank.id})`);
      return {
        isValid: true,
        bankInfo: foundBank,
      };
    } else {
      console.warn(`❌ Target account ${targetAccNum} not found in active CAS banks`);
      return {
        isValid: false,
        message: `Target account ${targetAccNum} not found in active CAS banks`,
      };
    }
  } catch (error) {
    console.error(
      `❌ Error validating target account with banks API:`,
      error.message
    );

    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(
          `Server error: ${error.response.status} - ${error.response.statusText}`
        );
        console.error(`Response data:`, error.response.data);

        // --- เพิ่มการ Log ลงไฟล์ ---
        logTrueMoneyWebhook({
          event: "TARGET_ACCOUNT_VALIDATION_ERROR_RESPONSE",
          error: error.message,
          status: error.response.status,
          statusText: error.response.statusText,
          responseData: error.response.data,
          target_account: targetAccNum,
          casApiUrl: casApiUrl,
          ...metadata,
        });

        return {
          isValid: false,
          message: `Banks API error: ${error.response.status} - ${error.response.statusText}`,
        };
      } else if (error.request) {
        console.error(`No response received from banks API`);

        // --- เพิ่มการ Log ลงไฟล์ (กรณี Timeout หรือ Unreachable) ---
        logTrueMoneyWebhook({
          event: "TARGET_ACCOUNT_VALIDATION_UNREACHABLE",
          error: error.message,
          errorCode: error.code,
          isTimeout: error.code === "ECONNABORTED",
          target_account: targetAccNum,
          casApiUrl: casApiUrl,
          ...metadata,
        });

        return {
          isValid: false,
          message: "Banks API unreachable",
        };
      }
    }

    // --- เพิ่มการ Log ลงไฟล์สำหรับ Error อื่นๆ ---
    logTrueMoneyWebhook({
      event: "TARGET_ACCOUNT_VALIDATION_ERROR",
      error: error.message,
      target_account: targetAccNum,
      casApiUrl: casApiUrl,
      ...metadata,
    });

    return {
      isValid: false,
      message: `Validation error: ${error.message}`,
    };
  }
}
