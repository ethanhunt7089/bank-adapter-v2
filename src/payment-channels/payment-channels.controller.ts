import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { PaymentChannelsService } from "./payment-channels.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CreatePaymentChannelDto,
  UpdatePaymentChannelDto,
  DeletePaymentChannelDto,
  PaymentChannelsResponseDto,
  CreatePaymentChannelResponseDto,
  UpdatePaymentChannelResponseDto,
  DeletePaymentChannelResponseDto,
} from "./dto/payment-channels.dto";

@Controller()
@UseGuards(JwtAuthGuard)
export class PaymentChannelsController {
  constructor(
    private readonly paymentChannelsService: PaymentChannelsService
  ) {}

  @Get("payment-channels")
  async getPaymentChannels(
    @Request() req: any
  ): Promise<PaymentChannelsResponseDto> {
    const tokenUuid = req.user.uuid;
    return this.paymentChannelsService.getPaymentChannels(tokenUuid);
  }

  @Post("create-payment-channels")
  async createPaymentChannel(
    @Body() createDto: CreatePaymentChannelDto,
    @Request() req: any
  ): Promise<CreatePaymentChannelResponseDto> {
    const tokenUuid = req.user.uuid;
    return this.paymentChannelsService.createPaymentChannel(
      createDto,
      tokenUuid
    );
  }

  @Put("update-payment-channels")
  async updatePaymentChannel(
    @Body() updateDto: UpdatePaymentChannelDto,
    @Request() req: any
  ): Promise<UpdatePaymentChannelResponseDto> {
    const tokenUuid = req.user.uuid;
    return this.paymentChannelsService.updatePaymentChannel(
      updateDto,
      tokenUuid
    );
  }

  @Delete("delete-payment-channels")
  async deletePaymentChannel(
    @Body() deleteDto: DeletePaymentChannelDto,
    @Request() req: any
  ): Promise<DeletePaymentChannelResponseDto> {
    const tokenUuid = req.user.uuid;
    return this.paymentChannelsService.deletePaymentChannel(
      deleteDto,
      tokenUuid
    );
  }
}
