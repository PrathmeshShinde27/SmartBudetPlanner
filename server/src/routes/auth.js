import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { createAndSendOtp, verifyOtp } from '../services/otpService.js';
import {
  forgotPasswordSchema,
  loginSchema,
  passwordUpdateSchema,
  profileUpdateSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from '../validation.js';

export const authRouter = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, config.jwtSecret, {
    expiresIn: config.tokenExpiresIn
  });
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, name, phone_country_code, phone_number, city)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
         id,
         email,
         name,
         phone_country_code AS "phoneCountryCode",
         phone_number AS "phoneNumber",
         city,
         email_verified AS "emailVerified",
         role,
         created_at AS "createdAt"`,
      [
        input.email,
        passwordHash,
        input.name || null,
        input.phoneCountryCode || null,
        input.phoneNumber || null,
        input.city || null
      ]
    );

    const user = result.rows[0];
    await createAndSendOtp({ userId: user.id, email: user.email, purpose: 'verify_email' });
    res.status(201).json({ message: 'Verification OTP sent', email: user.email });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await query(
      `SELECT
         id,
         email,
         name,
         phone_country_code AS "phoneCountryCode",
         phone_number AS "phoneNumber",
         city,
         email_verified AS "emailVerified",
         role,
         password_hash AS "passwordHash"
       FROM users
       WHERE email = $1`,
      [input.email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.emailVerified) {
      await createAndSendOtp({ userId: user.id, email: user.email, purpose: 'verify_email' });
      return res.status(403).json({
        message: 'Email verification required',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        email: user.email
      });
    }

    delete user.passwordHash;
    res.json({ user, token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         id,
         email,
         name,
         phone_country_code AS "phoneCountryCode",
         phone_number AS "phoneNumber",
         city,
         email_verified AS "emailVerified",
         role,
         created_at AS "createdAt"
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/verify-email', async (req, res, next) => {
  try {
    const input = verifyEmailSchema.parse(req.body);
    const result = await query(
      `SELECT
         id,
         email,
         name,
         phone_country_code AS "phoneCountryCode",
         phone_number AS "phoneNumber",
         city,
         email_verified AS "emailVerified",
         role,
         created_at AS "createdAt"
       FROM users
       WHERE email = $1`,
      [input.email]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await verifyOtp({ userId: user.id, purpose: 'verify_email', otp: input.otp });
    if (!valid) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const update = await query(
      `UPDATE users
       SET email_verified = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING
         id,
         email,
         name,
         phone_country_code AS "phoneCountryCode",
         phone_number AS "phoneNumber",
         city,
         email_verified AS "emailVerified",
         role,
         created_at AS "createdAt"`,
      [user.id]
    );
    const verifiedUser = update.rows[0];
    res.json({ user: verifiedUser, token: signToken(verifiedUser) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/resend-verification-otp', async (req, res, next) => {
  try {
    const input = resendOtpSchema.parse(req.body);
    const result = await query('SELECT id, email, email_verified AS "emailVerified" FROM users WHERE email = $1', [
      input.email
    ]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.json({ message: 'Email already verified' });
    await createAndSendOtp({ userId: user.id, email: user.email, purpose: 'verify_email' });
    res.json({ message: 'Verification OTP sent' });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    const result = await query('SELECT id, email FROM users WHERE email = $1', [input.email]);
    const user = result.rows[0];
    if (user) await createAndSendOtp({ userId: user.id, email: user.email, purpose: 'reset_password' });
    res.json({ message: 'If the email exists, a reset OTP has been sent' });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    const result = await query('SELECT id FROM users WHERE email = $1', [input.email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const valid = await verifyOtp({ userId: user.id, purpose: 'reset_password', otp: input.otp });
    if (!valid) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [user.id, passwordHash]);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
});

authRouter.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const input = profileUpdateSchema.parse(req.body);
    const result = await query(
      `UPDATE users
       SET
         name = COALESCE($2, name),
         city = COALESCE($3, city),
         updated_at = NOW()
       WHERE id = $1
       RETURNING
         id,
         email,
         name,
         phone_country_code AS "phoneCountryCode",
         phone_number AS "phoneNumber",
         city,
         email_verified AS "emailVerified",
         role,
         created_at AS "createdAt"`,
      [req.user.id, input.name, input.city]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

authRouter.put('/password', requireAuth, async (req, res, next) => {
  try {
    const input = passwordUpdateSchema.parse(req.body);
    const result = await query(
      `SELECT password_hash AS "passwordHash"
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [
      req.user.id,
      passwordHash
    ]);
    res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
});
