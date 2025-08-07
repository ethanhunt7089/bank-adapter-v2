import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WithdrawController } from './withdraw.controller';
import { WithdrawService } from './withdraw.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [WithdrawController],
  providers: [WithdrawService],
})
export class WithdrawModule {}
