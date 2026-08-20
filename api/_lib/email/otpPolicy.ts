import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_REQUEST_LIMIT_PER_HOUR = 5;
export const OTP_MAX_VERIFICATION_ATTEMPTS = 5;

export const generateOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export const hashOtp = (otp: string) => createHash('sha256').update(otp).digest('hex');

export const verifyOtpHash = (otp: string, expectedHash: string) => {
  const actual = Buffer.from(hashOtp(otp));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const isExpired = (expiresAt: string, now = Date.now()) =>
  new Date(expiresAt).getTime() <= now;

export const isRateLimited = (requestTimestamps: string[], now = Date.now()) =>
  requestTimestamps.filter((value) => (
    new Date(value).getTime() >= now - 60 * 60 * 1000
  )).length >= OTP_REQUEST_LIMIT_PER_HOUR;

export const isCooldownActive = (availableAt: string, now = Date.now()) =>
  new Date(availableAt).getTime() > now;
