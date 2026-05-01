import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { query } from '../db.js';
import { sendOtpEmail } from './emailService.js';

export function generateOtp() {
  return String(randomInt(100000, 1000000));
}

export async function createAndSendOtp({ userId, email, purpose }) {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 12);

  await query(
    `UPDATE email_otps
     SET consumed_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [userId, purpose]
  );

  await query(
    `INSERT INTO email_otps (user_id, purpose, otp_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    [userId, purpose, otpHash]
  );

  await sendOtpEmail({ to: email, otp, purpose });
}

export async function verifyOtp({ userId, purpose, otp }) {
  const result = await query(
    `SELECT id, otp_hash AS "otpHash"
     FROM email_otps
     WHERE user_id = $1
       AND purpose = $2
       AND consumed_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, purpose]
  );

  const record = result.rows[0];
  if (!record || !(await bcrypt.compare(otp, record.otpHash))) {
    return false;
  }

  await query('UPDATE email_otps SET consumed_at = NOW() WHERE id = $1', [record.id]);
  return true;
}
