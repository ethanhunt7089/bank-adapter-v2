import * as jwt from 'jsonwebtoken';

// Interface สำหรับ TrueMoney JWT payload
export interface TrueMoneyWebhookPayload {
  event_type: string;           // 'P2P'
  received_time: string;        // '2025-10-09T23:39:16+0700'
  sender_mobile: string;        // '0826536589'
  message: string;              // ข้อความที่แนบมา
  amount: number;               // 100
  channel: string;              // ช่องทาง
  sender_name: string;          // 'ทรงชัย เปร***'
  transaction_id: string;       // '5004661264167'
  iat?: number;                 // issued at timestamp
}

/**
 * Decode และ verify JWT token จาก TrueMoney webhook
 * @param token - JWT token ที่ได้รับจาก webhook
 * @param secret - Secret key สำหรับ verify token
 * @returns Decoded payload หรือ null ถ้า verify ไม่สำเร็จ
 */
export function verifyTrueMoneyToken(
  token: string,
  secret: string
): TrueMoneyWebhookPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as TrueMoneyWebhookPayload;
    return decoded;
  } catch (error) {
    console.error('TrueMoney JWT verification failed:', error.message);
    return null;
  }
}

/**
 * Decode JWT token โดยไม่ verify (ใช้สำหรับดูข้อมูลเบื้องต้น)
 * @param token - JWT token
 * @returns Decoded payload หรือ null ถ้า decode ไม่สำเร็จ
 */
export function decodeTrueMoneyToken(token: string): TrueMoneyWebhookPayload | null {
  try {
    const decoded = jwt.decode(token) as TrueMoneyWebhookPayload;
    return decoded;
  } catch (error) {
    console.error('TrueMoney JWT decode failed:', error.message);
    return null;
  }
}