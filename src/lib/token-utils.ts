import { prisma } from "./prisma";

/**
 * ดึงข้อมูล target domain จาก token โดยใช้ UUID
 * @param uuid - UUID ของ token
 * @returns target domain หรือ null ถ้าไม่พบ
 */
export async function getTargetDomainByUuid(
  uuid: string
): Promise<string | null> {
  try {
    const token = await prisma.token.findFirst({
      where: {
        uuid: uuid,
      },
      select: {
        targetDomain: true,
        isActive: true,
      },
    });

    if (!token) {
      //console.log(`❌ Token not found for UUID: ${uuid}`);
      return null;
    }

    if (!token.isActive) {
      //console.log(`❌ Token is inactive for UUID: ${uuid}`);
      return null;
    }

    //console.log(`✅ Found target domain: ${token.targetDomain} for UUID: ${uuid}`);
    return token.targetDomain;
  } catch (error) {
    console.error(`❌ Error getting target domain for UUID ${uuid}:`, error);
    return null;
  }
}

/**
 * ดึง target domain และ tokenHash โดยใช้ UUID
 * ใช้สำหรับเรียก backend ที่ยังต้องการ Bearer token เดิม
 */
export async function getTargetDomainAndTokenByUuid(
  uuid: string
): Promise<{ targetDomain: string; tokenHash: string } | null> {
  try {
    const token = await prisma.token.findFirst({
      where: { uuid },
      select: { targetDomain: true, tokenHash: true, isActive: true },
    });

    if (!token || !token.isActive || !token.tokenHash) {
      return null;
    }

    return { targetDomain: token.targetDomain, tokenHash: token.tokenHash };
  } catch (error) {
    console.error(`❌ Error getting domain+token by UUID ${uuid}:`, error);
    return null;
  }
}

/**
 * ดึงข้อมูล token ทั้งหมดโดยใช้ UUID
 * @param uuid - UUID ของ token
 * @returns token data หรือ null ถ้าไม่พบ
 */
export async function getTokenByUuid(uuid: string) {
  try {
    const token = await prisma.token.findFirst({
      where: {
        uuid: uuid,
      },
    });

    if (!token) {
      console.log(`❌ Token not found for UUID: ${uuid}`);
      return null;
    }

    console.log(`✅ Found token for UUID: ${uuid}`);
    return token;
  } catch (error) {
    console.error(`❌ Error getting token for UUID ${uuid}:`, error);
    return null;
  }
}

/**
 * ตรวจสอบว่า token มีอยู่และ active อยู่หรือไม่
 * @param uuid - UUID ของ token
 * @returns boolean
 */
export async function isTokenValid(uuid: string): Promise<boolean> {
  try {
    const token = await prisma.token.findFirst({
      where: {
        uuid: uuid,
      },
      select: {
        isActive: true,
      },
    });

    return token?.isActive ?? false;
  } catch (error) {
    console.error(`❌ Error validating token for UUID ${uuid}:`, error);
    return false;
  }
}

/**
 * ดึงรายการ tokens ทั้งหมด
 * @returns array ของ tokens
 */
export async function getAllTokens() {
  try {
    const tokens = await prisma.token.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Found ${tokens.length} tokens`);
    return tokens;
  } catch (error) {
    console.error(`❌ Error getting all tokens:`, error);
    return [];
  }
}
