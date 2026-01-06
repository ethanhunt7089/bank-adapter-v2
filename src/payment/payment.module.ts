import { Module } from "@nestjs/common";
import { PaymentController } from "./controllers/payment.controller";
import { WebhookController } from "./controllers/webhook.controller";
import { PaymentService } from "./services/payment.service";
import { PaymentGatewayFactory } from "./factories/payment-gateway.factory";
import { BibPayStrategy } from "./strategies/bibpay.strategy";
import { PayOneXStrategy } from "./strategies/payonex.strategy";
import { PrismaService } from "../lib/prisma.service";

@Module({
  controllers: [PaymentController, WebhookController],
  providers: [
    PaymentService,
    PaymentGatewayFactory,
    BibPayStrategy,
    PayOneXStrategy,
    PrismaService,
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
