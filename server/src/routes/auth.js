import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema, registerSchema } from '../validation.js';

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
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at AS "createdAt"`,
      [input.email, passwordHash, input.name || null]
    );

    const user = result.rows[0];
    res.status(201).json({ user, token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await query(
      `SELECT id, email, name, password_hash AS "passwordHash"
       FROM users
       WHERE email = $1`,
      [input.email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
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
      `SELECT id, email, name, created_at AS "createdAt"
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});
