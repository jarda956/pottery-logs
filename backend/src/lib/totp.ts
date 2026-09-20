import { authenticator } from "otplib";
import QRCode from "qrcode";

const ISSUER = "Pottery Logs";

authenticator.options = { window: 1 };

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function verifyTotpToken(secret: string, token: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export async function buildTotpQrCodeDataUrl(email: string, secret: string): Promise<string> {
  const otpauthUrl = authenticator.keyuri(email, ISSUER, secret);
  return QRCode.toDataURL(otpauthUrl);
}
