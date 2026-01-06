import { prisma } from "./prisma";

/**
 * ตรวจสอบว่า bo_token มีอยู่และ active อยู่หรือไม่
 * @param token - Token UUID ของ bo_token
 * @returns boolean
 */
export async function isBoTokenValid(token: string): Promise<boolean> {
  try {
    const boToken = await prisma.boToken.findUnique({
      where: {
        token: token,
      },
      select: {
        isActive: true,
      },
    });

    return boToken?.isActive ?? false;
  } catch (error) {
    console.error(`❌ Error validating bo_token for token ${token}:`, error);
    return false;
  }
}

/**
 * ดึงข้อมูล bo_token ทั้งหมดโดยใช้ token
 * @param token - Token UUID ของ bo_token
 * @returns bo_token data หรือ null ถ้าไม่พบ
 */
export async function getBoTokenByToken(token: string) {
  try {
    const boToken = await prisma.boToken.findUnique({
      where: {
        token: token,
      },
    });

    if (!boToken) {
      console.log(`❌ BoToken not found for token: ${token}`);
      return null;
    }

    console.log(`✅ Found bo_token for token: ${token}`);
    return boToken;
  } catch (error) {
    console.error(`❌ Error getting bo_token for token ${token}:`, error);
    return null;
  }
}

/**
 * ดึงข้อมูล target domain จาก bo_token โดยใช้ token
 * @param token - Token UUID ของ bo_token
 * @returns target domain หรือ null ถ้าไม่พบ
 */
export async function getTargetDomainByBoToken(
  token: string
): Promise<string | null> {
  try {
    const boWebhook = await prisma.boWebhook.findFirst({
      where: {
        boToken: {
          token: token,
          isActive: true,
        },
      },
      select: {
        targetDomain: true,
      },
    });

    if (!boWebhook) {
      console.log(`❌ BoWebhook not found or BoToken inactive for token: ${token}`);
      return null;
    }

    console.log(
      `✅ Found target domain: ${boWebhook.targetDomain} for token: ${token}`
    );
    return boWebhook.targetDomain;
  } catch (error) {
    console.error(`❌ Error getting target domain for token ${token}:`, error);
    return null;
  }
}

/**
 * ดึงข้อมูล payment system จาก bo_token โดยใช้ token
 * @param token - Token UUID ของ bo_token
 * @returns payment system หรือ null ถ้าไม่พบ
 */
export async function getPaymentSysByBoToken(
  token: string
): Promise<string | null> {
  try {
    const boToken = await prisma.boToken.findUnique({
      where: {
        token: token,
      },
      select: {
        paymentSys: true,
        isActive: true,
      },
    });

    if (!boToken) {
      console.log(`❌ BoToken not found for token: ${token}`);
      return null;
    }

    if (!boToken.isActive) {
      console.log(`❌ BoToken is inactive for token: ${token}`);
      return null;
    }

    console.log(
      `✅ Found payment system: ${boToken.paymentSys} for token: ${token}`
    );
    return boToken.paymentSys;
  } catch (error) {
    console.error(`❌ Error getting payment system for token ${token}:`, error);
    return null;
  }
}

/**
 * ตรวจสอบสิทธิ์ deposit จาก bo_token
 * @param token - Token UUID ของ bo_token
 * @returns boolean
 */
export async function canDeposit(token: string): Promise<boolean> {
  try {
    const boToken = await prisma.boToken.findUnique({
      where: {
        token: token,
      },
      select: {
        deposit: true,
        isActive: true,
      },
    });

    if (!boToken || !boToken.isActive) {
      return false;
    }

    return boToken.deposit;
  } catch (error) {
    console.error(
      `❌ Error checking deposit permission for token ${token}:`,
      error
    );
    return false;
  }
}

/**
 * ตรวจสอบสิทธิ์ withdraw จาก bo_token
 * @param token - Token UUID ของ bo_token
 * @returns boolean
 */
export async function canWithdraw(token: string): Promise<boolean> {
  try {
    const boToken = await prisma.boToken.findUnique({
      where: {
        token: token,
      },
      select: {
        withdraw: true,
        isActive: true,
      },
    });

    if (!boToken || !boToken.isActive) {
      return false;
    }

    return boToken.withdraw;
  } catch (error) {
    console.error(
      `❌ Error checking withdraw permission for token ${token}:`,
      error
    );
    return false;
  }
}

/**
 * ดึงข้อมูล payment keys จาก bo_token โดยใช้ token
 * @param token - Token UUID ของ bo_token
 * @returns payment keys array หรือ null ถ้าไม่พบ
 */
export async function getPaymentKeysByBoToken(token: string) {
  try {
    const boToken = await prisma.boToken.findUnique({
      where: {
        token: token,
      },
      include: {
        paymentKeys: true,
      },
    });

    if (!boToken) {
      console.log(`❌ BoToken not found for token: ${token}`);
      return null;
    }

    console.log(
      `✅ Found ${boToken.paymentKeys.length} payment keys for token: ${token}`
    );
    return boToken.paymentKeys;
  } catch (error) {
    console.error(`❌ Error getting payment keys for token ${token}:`, error);
    return null;
  }
}

/**
 * ตรวจสอบว่า token มีสิทธิ์และ active อยู่หรือไม่ (รวมการตรวจสอบสิทธิ์ deposit/withdraw)
 * @param token - Token UUID ของ bo_token
 * @param requiredPermission - 'deposit', 'withdraw', หรือ 'both'
 * @returns boolean
 */
export async function validateBoTokenPermission(
  token: string,
  requiredPermission: "deposit" | "withdraw" | "both" = "both"
): Promise<boolean> {
  try {
    const boToken = await prisma.boToken.findUnique({
      where: {
        token: token,
      },
      select: {
        isActive: true,
        deposit: true,
        withdraw: true,
      },
    });

    if (!boToken || !boToken.isActive) {
      return false;
    }

    switch (requiredPermission) {
      case "deposit":
        return boToken.deposit;
      case "withdraw":
        return boToken.withdraw;
      case "both":
        return boToken.deposit && boToken.withdraw;
      default:
        return false;
    }
  } catch (error) {
    console.error(
      `❌ Error validating bo_token permission for token ${token}:`,
      error
    );
    return false;
  }
}
