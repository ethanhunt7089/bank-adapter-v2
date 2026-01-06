import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Bank Adapter V2 - Auth Only!';
  }
}