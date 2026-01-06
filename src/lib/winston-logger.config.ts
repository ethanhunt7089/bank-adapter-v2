import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';

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
    
    // File output - All logs
    new winston.transports.File({
      filename: path.join(logsDir, 'webhook-combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    
    // File output - Error logs only
    new winston.transports.File({
      filename: path.join(logsDir, 'webhook-error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    
    // File output - TrueMoney specific
    new winston.transports.File({
      filename: path.join(logsDir, 'truemoney-webhook.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
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

