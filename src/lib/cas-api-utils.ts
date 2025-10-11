import axios from 'axios';

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
  targetDomain: string; // เช่น https://chok369.xyz
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
  const domainParts = hostname.split('.');
  const mainDomain = domainParts.slice(-2).join('.'); // chok369.xyz
  
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
export async function loginToCas(config: CasApiConfig): Promise<CasLoginResponse> {
  try {
    const casApiUrl = getCasApiUrl(config.targetDomain);
    const loginUrl = `${casApiUrl}/admin/login`;
    
    const loginData: CasLoginRequest = {
      username: config.casUser,
      password: config.casPassword
    };
    
    console.log(`Attempting CAS login to: ${loginUrl}`);
    console.log(`Username: ${config.casUser}`);
    
    const response = await axios.post<CasLoginResponse>(loginUrl, loginData, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Bank-Adapter-v2/1.0'
      },
      timeout: 10000 // 10 seconds timeout
    });
    
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`CAS login failed with status: ${response.status}`);
    }
    
    console.log(`✅ CAS login successful for ${config.casUser}`);
    console.log(`Access token: ${response.data.access_token.substring(0, 20)}...`);
    
    return response.data;
    
  } catch (error) {
    console.error(`❌ CAS login failed:`, error.message);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        console.error(`Server error: ${error.response.status} - ${error.response.statusText}`);
        console.error(`Response data:`, error.response.data);
        throw new Error(`CAS API error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        // Request was made but no response received
        console.error(`No response received from CAS API`);
        throw new Error('CAS API unreachable');
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
    axios.post(callbackUrl, callbackData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Bank-Adapter-v2/1.0'
      },
      timeout: 5000 // 5 seconds timeout
    }).then(response => {
      console.log(`✅ Callback sent successfully to CAS, Status: ${response.status}`);
    }).catch(error => {
      console.error(`❌ Failed to send callback to CAS:`, error.message);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(`Server error: ${error.response.status} - ${error.response.statusText}`);
          console.error(`Response data:`, error.response.data);
        }
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
