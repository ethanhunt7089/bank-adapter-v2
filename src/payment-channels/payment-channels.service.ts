import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../lib/prisma.service";
import { PaymentGatewayFactory } from "../payment/factories/payment-gateway.factory";
import {
  CreatePaymentChannelDto,
  UpdatePaymentChannelDto,
  DeletePaymentChannelDto,
  PaymentChannelsResponseDto,
  CreatePaymentChannelResponseDto,
  UpdatePaymentChannelResponseDto,
  DeletePaymentChannelResponseDto,
  PaymentChannelDataDto,
} from "./dto/payment-channels.dto";

@Injectable()
export class PaymentChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentGatewayFactory: PaymentGatewayFactory
  ) {}

  async getPaymentChannels(
    tokenUuid: string
  ): Promise<PaymentChannelsResponseDto> {
    try {
      // ดึงรายการ channels ทั้งหมดของ token นี้
      const channels = await this.prisma.paymentChannel.findMany({
        where: {
          tokenUuid: tokenUuid,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // แปลงข้อมูลให้ตรงกับ DTO format
      const channelData: PaymentChannelDataDto[] = channels.map((channel) => ({
        id: channel.id,
        type: channel.type,
        bankCode: channel.bankCode,
        bankNo: channel.bankNo,
        bankName: channel.bankName,
        enable: channel.enable,
        autoDeposit: channel.autoDeposit,
        autoWithdraw: channel.autoWithdraw,
        payment_sys: channel.paymentSys,
      }));

      return {
        success: true,
        data: {
          allPaymentSys: this.paymentGatewayFactory.getAllPaymentSystems(),
          channels: channelData,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve payment channels",
      };
    }
  }

  async createPaymentChannel(
    dto: CreatePaymentChannelDto,
    tokenUuid: string
  ): Promise<CreatePaymentChannelResponseDto> {
    try {
      // Validation: ถ้า type เป็น payment_gateway ต้องมี payment_sys
      if (dto.type === "payment_gateway") {
        // ตรวจสอบว่ามี payment_gateway อยู่แล้วหรือไม่
        const existingPaymentGateway =
          await this.prisma.paymentChannel.findFirst({
            where: {
              tokenUuid: tokenUuid,
              type: "payment_gateway",
            },
          });

        if (existingPaymentGateway) {
          throw new BadRequestException(
            "Payment gateway already exists. Only one payment gateway is allowed per token."
          );
        }

        if (!dto.payment_sys) {
          throw new BadRequestException(
            "payment_sys is required for payment_gateway type"
          );
        }
        if (
          !this.paymentGatewayFactory
            .getAllPaymentSystems()
            .map((sys) => sys.toLowerCase())
            .includes(dto.payment_sys)
        ) {
          throw new BadRequestException(
            `Unsupported payment system: ${dto.payment_sys}`
          );
        }
        // ต้องไม่มี bank information
        if (dto.bankCode || dto.bankNo || dto.bankName) {
          throw new BadRequestException(
            "Bank information should be null for payment_gateway type"
          );
        }
      } else {
        // ถ้า type เป็น bank_sms หรือ bank_slip ต้องมี bank information
        if (!dto.bankCode || !dto.bankNo || !dto.bankName) {
          throw new BadRequestException(
            "Bank information is required for bank_sms and bank_slip types"
          );
        }
        // ต้องไม่มี payment_sys
        if (dto.payment_sys) {
          throw new BadRequestException(
            "payment_sys should be null for bank_sms and bank_slip types"
          );
        }
      }

      // สร้าง payment channel ใหม่
      const newChannel = await this.prisma.paymentChannel.create({
        data: {
          type: dto.type,
          bankCode: dto.type === "payment_gateway" ? null : dto.bankCode,
          bankNo: dto.type === "payment_gateway" ? null : dto.bankNo,
          bankName: dto.type === "payment_gateway" ? null : dto.bankName,
          paymentSys: dto.type === "payment_gateway" ? dto.payment_sys : null,
          enable: dto.enable,
          autoDeposit: dto.autoDeposit,
          autoWithdraw: dto.autoWithdraw,
          tokenUuid: tokenUuid,
        },
      });

      const channelData: PaymentChannelDataDto = {
        id: newChannel.id,
        type: newChannel.type,
        bankCode: newChannel.bankCode,
        bankNo: newChannel.bankNo,
        bankName: newChannel.bankName,
        enable: newChannel.enable,
        autoDeposit: newChannel.autoDeposit,
        autoWithdraw: newChannel.autoWithdraw,
        payment_sys: newChannel.paymentSys,
      };

      return {
        success: true,
        data: channelData,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        return {
          success: false,
          message: error.message,
        };
      }
      return {
        success: false,
        message: "Failed to create payment channel",
      };
    }
  }

  async updatePaymentChannel(
    dto: UpdatePaymentChannelDto,
    tokenUuid: string
  ): Promise<UpdatePaymentChannelResponseDto> {
    try {
      // ตรวจสอบว่า channel นี้มีอยู่และเป็นของ token นี้
      const existingChannel = await this.prisma.paymentChannel.findFirst({
        where: {
          id: dto.id,
          tokenUuid: tokenUuid,
        },
      });

      if (!existingChannel) {
        throw new NotFoundException("Payment channel not found");
      }

      // Validation เหมือน create
      if (dto.type === "payment_gateway") {
        if (!dto.payment_sys) {
          throw new BadRequestException(
            "payment_sys is required for payment_gateway type"
          );
        }
        if (
          !this.paymentGatewayFactory
            .getAllPaymentSystems()
            .map((sys) => sys.toLowerCase())
            .includes(dto.payment_sys)
        ) {
          throw new BadRequestException(
            `Unsupported payment system: ${dto.payment_sys}`
          );
        }
        if (dto.bankCode || dto.bankNo || dto.bankName) {
          throw new BadRequestException(
            "Bank information should be null for payment_gateway type"
          );
        }
      } else {
        if (!dto.bankCode || !dto.bankNo || !dto.bankName) {
          throw new BadRequestException(
            "Bank information is required for bank_sms and bank_slip types"
          );
        }
        if (dto.payment_sys) {
          throw new BadRequestException(
            "payment_sys should be null for bank_sms and bank_slip types"
          );
        }
      }

      // อัพเดท payment channel
      await this.prisma.paymentChannel.update({
        where: { id: dto.id },
        data: {
          type: dto.type,
          bankCode: dto.type === "payment_gateway" ? null : dto.bankCode,
          bankNo: dto.type === "payment_gateway" ? null : dto.bankNo,
          bankName: dto.type === "payment_gateway" ? null : dto.bankName,
          paymentSys: dto.type === "payment_gateway" ? dto.payment_sys : null,
          enable: dto.enable,
          autoDeposit: dto.autoDeposit,
          autoWithdraw: dto.autoWithdraw,
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        return {
          success: false,
          message: error.message,
        };
      }
      return {
        success: false,
        message: "Failed to update payment channel",
      };
    }
  }

  async deletePaymentChannel(
    dto: DeletePaymentChannelDto,
    tokenUuid: string
  ): Promise<DeletePaymentChannelResponseDto> {
    try {
      // ตรวจสอบว่า channel นี้มีอยู่และเป็นของ token นี้
      const existingChannel = await this.prisma.paymentChannel.findFirst({
        where: {
          id: dto.id,
          tokenUuid: tokenUuid,
        },
      });

      if (!existingChannel) {
        throw new NotFoundException("Payment channel not found");
      }

      // ลบ payment channel
      await this.prisma.paymentChannel.delete({
        where: { id: dto.id },
      });

      return {
        success: true,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          message: error.message,
        };
      }
      return {
        success: false,
        message: "Failed to delete payment channel",
      };
    }
  }
}
