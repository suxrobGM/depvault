import { randomBytes } from "crypto";
import { singleton } from "tsyringe";
import { BadRequestError, NotFoundError } from "@/common/errors";
import { PrismaClient } from "@/generated/prisma";
import { TokenService } from "./token.service";

const DEVICE_CODE_EXPIRY_MINUTES = 15;
const USER_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

@singleton()
export class DeviceCodeService {
  private readonly frontendUrl = process.env.FRONTEND_URL!;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly tokenService: TokenService,
  ) {}

  async createDeviceCode() {
    await this.cleanupExpired();

    const deviceCode = randomBytes(32).toString("hex");
    const userCode = this.generateUserCode();
    const expiresAt = new Date(Date.now() + DEVICE_CODE_EXPIRY_MINUTES * 60_000);

    await this.prisma.deviceCode.create({
      data: { deviceCode, userCode, expiresAt },
    });

    return {
      deviceCode,
      userCode,
      verificationUrl: `${this.frontendUrl}/cli/verify?code=${userCode}`,
      expiresIn: DEVICE_CODE_EXPIRY_MINUTES * 60,
    };
  }

  async verifyDeviceCode(userCode: string, userId: string) {
    const record = await this.prisma.deviceCode.findUnique({
      where: { userCode: userCode.toUpperCase() },
    });

    if (!record) throw new NotFoundError("Invalid verification code");
    if (record.expiresAt < new Date()) throw new BadRequestError("Verification code has expired");
    if (record.status !== "PENDING") throw new BadRequestError("Code has already been used");

    await this.prisma.deviceCode.update({
      where: { id: record.id },
      data: { status: "VERIFIED", userId },
    });

    return { message: "Device authorized successfully" };
  }

  async pollDeviceCode(deviceCode: string) {
    await this.cleanupExpired();

    const record = await this.prisma.deviceCode.findUnique({
      where: { deviceCode },
      include: {
        user: {
          include: { accounts: { take: 1 } },
        },
      },
    });

    if (!record || record.expiresAt < new Date()) {
      return { status: "expired" as const };
    }

    if (record.status === "PENDING") {
      return { status: "pending" as const };
    }

    if (record.status === "VERIFIED" && record.user) {
      const user = record.user;
      const account = user.accounts[0];
      if (!account) return { status: "expired" as const };

      const tokens = await this.tokenService.issueTokens(
        user,
        account.provider,
        account.providerAccountId,
      );

      await this.prisma.deviceCode.delete({ where: { id: record.id } });

      return {
        status: "verified" as const,
        ...tokens,
      };
    }

    return { status: "expired" as const };
  }

  private async cleanupExpired() {
    await this.prisma.deviceCode.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  private generateUserCode(): string {
    const bytes = randomBytes(8);
    const chars = Array.from(bytes)
      .map((b) => USER_CODE_CHARS[b % USER_CODE_CHARS.length])
      .join("");
    return `${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
  }
}
