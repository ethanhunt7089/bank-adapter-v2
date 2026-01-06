import { Injectable } from "@nestjs/common";
import { BibPayStrategy } from "../strategies/bibpay.strategy";
import { PayOneXStrategy } from "../strategies/payonex.strategy";
import { IPaymentGateway } from "../interfaces/payment-gateway.interface";
import { GatewayType } from "../interfaces/payment-gateway.interface";

@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly bibPayStrategy: BibPayStrategy,
    private readonly payOneXStrategy: PayOneXStrategy
  ) {}

  createGateway(gatewayType: GatewayType): IPaymentGateway {
    switch (gatewayType) {
      case GatewayType.BIBPAY:
        return this.bibPayStrategy;
      case GatewayType.PAYONEX:
        return this.payOneXStrategy;
      default:
        throw new Error(`Unsupported gateway type: ${gatewayType}`);
    }
  }

  getSupportedGateways(): GatewayType[] {
    return [GatewayType.BIBPAY, GatewayType.PAYONEX]; // ทั้งคู่ implement แล้ว
  }

  getAllPaymentSystems(): string[] {
    return ["bibpay", "payonex"]; // ทั้งหมดที่จะรองรับ (รวม PayOneX ที่ยังไม่ได้ทำ)
  }
}
