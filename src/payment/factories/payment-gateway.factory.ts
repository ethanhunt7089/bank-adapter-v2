import { Injectable } from "@nestjs/common";
import { BibPayStrategy } from "../strategies/bibpay.strategy";
import { EasyPayStrategy } from "../strategies/easypay.strategy";
import { IPaymentGateway } from "../interfaces/payment-gateway.interface";
import { GatewayType } from "../interfaces/payment-gateway.interface";

@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly bibPayStrategy: BibPayStrategy,
    private readonly easyPayStrategy: EasyPayStrategy
  ) {}

  createGateway(gatewayType: GatewayType): IPaymentGateway {
    switch (gatewayType) {
      case GatewayType.BIBPAY:
        return this.bibPayStrategy;
      case GatewayType.EASYPAY:
        return this.easyPayStrategy;
      default:
        throw new Error(`Unsupported gateway type: ${gatewayType}`);
    }
  }

  getSupportedGateways(): GatewayType[] {
    return [GatewayType.BIBPAY, GatewayType.EASYPAY];
  }
}
