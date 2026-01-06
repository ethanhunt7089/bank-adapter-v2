import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { BankAccountModule } from "./bank-account/bank-account.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { PaymentModule } from "./payment/payment.module";
import { PaymentChannelsModule } from "./payment-channels/payment-channels.module";
import { UserModule } from "./user/user.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    BankAccountModule,
    TransactionsModule,
    PaymentModule,
    PaymentChannelsModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
