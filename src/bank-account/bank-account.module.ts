import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BankAccountController } from './bank-account.controller';
import { BankAccountService } from './bank-account.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [BankAccountController],
  providers: [BankAccountService],
})
export class BankAccountModule {}
