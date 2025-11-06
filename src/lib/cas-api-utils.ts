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
 * Login ไปที่ CAS API และรับ access_token
 * @param config - ข้อมูลสำหรับ login
 * @returns access_token และ profile
 */
export async function loginToCas(
  config: CasApiConfig
): Promise<CasLoginResponse> {
  try {
    // ใช้ casApiBase ถ้ามี ถ้าไม่มีจึงใช้ targetDomain
    const casApiUrl = config.casApiBase || getCasApiUrl(config.targetDomain);
    const loginUrl = `${casApiUrl}/admin/login`;

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
      timeout: 30000, // 10 seconds timeout
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`CAS login failed with status: ${response.status}`);
    }

    console.log(`✅ CAS login successful for ${config.casUser}`);
    console.log(
      `Access token: ${response.data.access_token.substring(0, 20)}...`
    );

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
        throw new Error(
          `CAS API error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`
        );
      } else if (error.request) {
        // Request was made but no response received
        console.error(`No response received from CAS API`);
        throw new Error("CAS API unreachable");
      }
    }

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
            });
          } else {
            logTrueMoneyWebhook({
              event: "CAS_CALLBACK_ERROR",
              error: error.message,
              callbackUrl: callbackUrl,
            });
          }
        } else {
          logTrueMoneyWebhook({
            event: "CAS_CALLBACK_ERROR",
            error: error.message,
            callbackUrl: callbackUrl,
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
 * Helper function สำหรับใช้งาน CAS API แบบครบวงจร
 * @param config - ข้อมูลสำหรับ login
 * @param callbackUrl - URL ที่จะส่ง callback ไป
 * @param callbackData - ข้อมูลที่จะส่ง
 */
export async function handleCasCallback(
  config: CasApiConfig,
  callbackUrl: string,
  callbackData: any
): Promise<void> {
  try {
    // 1. Login เพื่อเอา access_token
    const loginResponse = await loginToCas(config);
    const accessToken = loginResponse.access_token;

    // 2. ส่ง callback ไปยัง CAS
    await sendCallbackToCas(callbackUrl, callbackData, accessToken);

    console.log(`✅ CAS callback completed successfully`);
  } catch (error) {
    console.error(`❌ CAS callback failed:`, error.message);
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
  targetDomain: string,
  accessToken: string,
  targetAccNum: string
): Promise<{ isValid: boolean; bankInfo?: any; message?: string }> {
  try {
    const casApiUrl = getCasApiUrl(targetDomain);
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

    // ค้นหาบัญชีที่ตรงกับ targetAccNum (เช็คแค่เบอร์โทรศัพท์)
    const foundBank = banks.find((bank: any) => {
      return (
        bank.phone_number === targetAccNum &&
        bank.is_show === true &&
        bank.is_enable_deposit === true
      );
    });

    if (foundBank) {
      console.log(`✅ Found target account ${targetAccNum} in CAS banks`);
      console.log(`Bank info:`, JSON.stringify(foundBank, null, 2));
      return {
        isValid: true,
        bankInfo: foundBank,
      };
    } else {
      console.warn(`❌ Target account ${targetAccNum} not found in CAS banks`);
      return {
        isValid: false,
        message: `Target account ${targetAccNum} not found in CAS banks`,
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
        return {
          isValid: false,
          message: `Banks API error: ${error.response.status} - ${error.response.statusText}`,
        };
      } else if (error.request) {
        console.error(`No response received from banks API`);
        return {
          isValid: false,
          message: "Banks API unreachable",
        };
      }
    }

    return {
      isValid: false,
      message: `Validation error: ${error.message}`,
    };
  }
}
