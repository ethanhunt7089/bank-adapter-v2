import { Module } from "@nestjs/common";
import { PaymentChannelsController } from "./payment-channels.controller";
import { PaymentChannelsService } from "./payment-channels.service";
import { PrismaService } from "../lib/prisma.service";
import { PaymentGatewayFactory } from "../payment/factories/payment-gateway.factory";
import { BibPayStrategy } from "../payment/strategies/bibpay.strategy";
import { PayOneXStrategy } from "../payment/strategies/payonex.strategy";

@Module({
  controllers: [PaymentChannelsController],
  providers: [
    PaymentChannelsService,
    PrismaService,
    PaymentGatewayFactory,
    BibPayStrategy,
    PayOneXStrategy,
  ],
})
export class PaymentChannelsModule {}
