export interface CreateDepositPayload {
  refCode: string;
  amount: number;
  accountName: string;
  bankNumber: string;
  bankCode: string;
  callbackUrl: string;
}

export interface CreateWithdrawPayload {
  refCode: string;
  amount: number;
  accountName: string;
  bankNumber: string;
  bankCode: string;
  callbackUrl: string;
}

export interface DepositResponse {
  success: boolean;
  message?: string;
  qrcodeUrl?: string;
  paymentTrx?: string;
  gatewayResponse?: any;
}

export interface WithdrawResponse {
  success: boolean;
  message?: string;
  paymentTrx?: string;
  gatewayResponse?: any;
  refCode?: string; // เพิ่ม refCode
}

export interface WebhookData {
  refCode: string;
  transactionType: "deposit" | "withdraw";
  gatewayType: "bibpay" | "payonex";
  data: any;
}

export interface IPaymentGateway {
  createDeposit(
    payload: CreateDepositPayload,
    token?: any
  ): Promise<DepositResponse>;
  createWithdraw(
    payload: CreateWithdrawPayload,
    token?: any
  ): Promise<WithdrawResponse>;
  handleWebhook(webhookData: WebhookData): Promise<void>;
  getBalance(token: any): Promise<any>;
}

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  TIMEOUT = "timeout",
  FAIL = "fail",
}

export enum GatewayType {
  BIBPAY = "bibpay",
  PAYONEX = "payonex",
}

export enum TransactionType {
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
}
