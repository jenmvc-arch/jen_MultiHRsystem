import assert from 'node:assert/strict';
import {
  generateOtp,
  hashOtp,
  isCooldownActive,
  isExpired,
  isRateLimited,
  verifyOtpHash,
  OTP_REQUEST_LIMIT_PER_HOUR,
} from '../api/_lib/email/otpPolicy.js';

const otp = generateOtp();
assert.match(otp, /^\d{6}$/);
assert.equal(verifyOtpHash(otp, hashOtp(otp)), true);
assert.equal(verifyOtpHash('000000', hashOtp(otp)), otp === '000000');
assert.equal(isExpired(new Date(Date.now() - 1).toISOString()), true);
assert.equal(isExpired(new Date(Date.now() + 60_000).toISOString()), false);
assert.equal(isCooldownActive(new Date(Date.now() + 60_000).toISOString()), true);
assert.equal(isCooldownActive(new Date(Date.now() - 1).toISOString()), false);

const timestamps = Array.from({ length: OTP_REQUEST_LIMIT_PER_HOUR }, () => new Date().toISOString());
assert.equal(isRateLimited(timestamps), true);
assert.equal(isRateLimited(timestamps.slice(1)), false);

console.log('OTP policy tests passed.');
