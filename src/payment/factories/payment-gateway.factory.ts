import { Injectable } from "@nestjs/common";
import { BibPayStrategy } from "../strategies/bibpay.strategy";
import { IPaymentGateway } from "../interfaces/payment-gateway.interface";
import { GatewayType } from "../interfaces/payment-gateway.interface";

@Injectable()
export class PaymentGatewayFactory {
  constructor(private readonly bibPayStrategy: BibPayStrategy) {}

  createGateway(gatewayType: GatewayType): IPaymentGateway {
    switch (gatewayType) {
      case GatewayType.BIBPAY:
        return this.bibPayStrategy;
      case GatewayType.ONEPAY:
        throw new Error("OnePayX strategy is not implemented yet");
      default:
        throw new Error(`Unsupported gateway type: ${gatewayType}`);
    }
  }

  getSupportedGateways(): GatewayType[] {
    return [GatewayType.BIBPAY]; // เฉพาะที่ implement แล้ว
  }

  getAllPaymentSystems(): string[] {
    return ["BIB-pay", "OnePayX"]; // ทั้งหมดที่จะรองรับ (รวม OnePayX ที่ยังไม่ได้ทำ)
  }
}
