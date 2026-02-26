import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

// สร้างโฟลเดอร์ logs ถ้ายังไม่มี
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`✅ Created logs directory: ${logsDir}`);
}

// Custom format สำหรับ log
const customFormat = winston.format.printf(({ timestamp, level, message, ...meta }) => {
  let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  // ถ้ามี metadata เพิ่มเติม
  if (Object.keys(meta).length > 0) {
    logMessage += `\n${JSON.stringify(meta, null, 2)}`;
  }

  return logMessage;
});

// สร้าง Winston Logger
export const webhookLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    customFormat
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),

    // File output - All logs (Daily Rotate + Size Limit)
    // ชื่อไฟล์: webhook-combined-YYYY-MM-DD.log
    // ถ้าไฟล์ขนาดเกิน 10MB จะแยกเป็น _1, _2 ฯลฯ
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'webhook-combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',           // แยกไฟล์ทุก 10MB → _1, _2, ...
      maxFiles: '14d',          // เก็บย้อนหลัง 14 วัน
      zippedArchive: false,
    }),

    // File output - Error logs only (Daily Rotate)
    // ชื่อไฟล์: webhook-error-YYYY-MM-DD.log
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'webhook-error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '10m',
      maxFiles: '30d',          // เก็บ error ย้อนหลัง 30 วัน
      zippedArchive: false,
    }),

    // File output - TrueMoney specific (Daily Rotate)
    // ชื่อไฟล์: truemoney-webhook-YYYY-MM-DD.log
    // ถ้าวันนี้มีเกิน 1 ไฟล์ → truemoney-webhook-2026-02-26.log, truemoney-webhook-2026-02-26_1.log, ...
    new winston.transports.DailyRotateFile({
      filename: path.join(logsDir, 'truemoney-webhook-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: false,
      auditFile: path.join(logsDir, '.truemoney-audit.json'), // ติดตาม index ไฟล์
    }),
  ],
});

// Helper function สำหรับ log TrueMoney webhook
export function logTrueMoneyWebhook(data: {
  event: string;
  method?: string;
  rawData?: any;
  decoded?: any;
  domain?: string;
  token?: string;
  amount?: number;
  error?: string;
  [key: string]: any;
}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: data.event,
    ...data,
  };

  if (data.error) {
    webhookLogger.error(`TrueMoney Webhook - ${data.event}`, logEntry);
  } else {
    webhookLogger.info(`TrueMoney Webhook - ${data.event}`, logEntry);
  }
}

export default webhookLogger;

