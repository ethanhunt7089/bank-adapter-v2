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

  async getPaymentChannelById(
    id: number,
    tokenUuid: string
  ): Promise<CreatePaymentChannelResponseDto> {
    try {
      // ดึง channel ตาม ID และ tokenUuid
      const channel = await this.prisma.paymentChannel.findFirst({
        where: {
          id: id,
          tokenUuid: tokenUuid,
        },
      });

      if (!channel) {
        return {
          success: false,
          message: "Payment channel not found",
        };
      }

      const channelData: PaymentChannelDataDto = {
        id: channel.id,
        type: channel.type,
        bankCode: channel.bankCode,
        bankNo: channel.bankNo,
        bankName: channel.bankName,
        enable: channel.enable,
        autoDeposit: channel.autoDeposit,
        autoWithdraw: channel.autoWithdraw,
        payment_sys: channel.paymentSys,
      };

      return {
        success: true,
        message: null,
        data: channelData,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve payment channel",
      };
    }
  }

  async createPaymentChannel(
    dto: CreatePaymentChannelDto,
    tokenUuid: string
  ): Promise<CreatePaymentChannelResponseDto> {
    try {
      console.log("=== Create Payment Channel Debug ===");
      console.log("DTO:", JSON.stringify(dto, null, 2));
      console.log("TokenUuid:", tokenUuid);
      console.log("================================");
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

        // ถ้าไม่ส่ง payment_sys มา ให้ default เป็น "bibpay"
        if (!dto.payment_sys) {
          dto.payment_sys = "bibpay";
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
        // อนุญาตให้ส่ง bank information ได้ (ไม่บังคับ)
        // Bank information จะถูกเก็บไว้แต่ไม่ใช้ในการประมวลผล payment gateway
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
      console.log("Creating payment channel with data:", {
        type: dto.type,
        bankCode:
          dto.type === "payment_gateway"
            ? (dto.bankCode ?? null)
            : dto.bankCode,
        bankNo:
          dto.type === "payment_gateway" ? (dto.bankNo ?? null) : dto.bankNo,
        bankName:
          dto.type === "payment_gateway"
            ? (dto.bankName ?? null)
            : dto.bankName,
        paymentSys: dto.type === "payment_gateway" ? dto.payment_sys : null,
        enable: dto.enable,
        autoDeposit: dto.autoDeposit,
        autoWithdraw: dto.autoWithdraw,
        tokenUuid: tokenUuid,
      });

      const newChannel = await this.prisma.paymentChannel.create({
        data: {
          type: dto.type,
          bankCode:
            dto.type === "payment_gateway"
              ? (dto.bankCode ?? null)
              : dto.bankCode,
          bankNo:
            dto.type === "payment_gateway" ? (dto.bankNo ?? null) : dto.bankNo,
          bankName:
            dto.type === "payment_gateway"
              ? (dto.bankName ?? null)
              : dto.bankName,
          paymentSys: dto.type === "payment_gateway" ? dto.payment_sys : null,
          enable: dto.enable,
          autoDeposit: dto.autoDeposit,
          autoWithdraw: dto.autoWithdraw,
          tokenUuid: tokenUuid,
        },
      });

      console.log("Payment channel created successfully:", newChannel);

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
      console.error("=== Create Payment Channel Error ===");
      console.error("Error:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Error name:", error.name);
      console.error("================================");

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
        // ถ้าไม่ส่ง payment_sys มา ให้ default เป็น "bibpay"
        if (!dto.payment_sys) {
          dto.payment_sys = "bibpay";
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
        // อนุญาตให้มี bankCode/bankNo/bankName ได้ (ไม่บังคับ)
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
          bankCode:
            dto.type === "payment_gateway"
              ? (dto.bankCode ?? null)
              : dto.bankCode,
          bankNo:
            dto.type === "payment_gateway" ? (dto.bankNo ?? null) : dto.bankNo,
          bankName:
            dto.type === "payment_gateway"
              ? (dto.bankName ?? null)
              : dto.bankName,
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
