import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { paymentTypeSchema } from '../validation.js';

export const paymentTypesRouter = express.Router();

async function ensureDefaultPaymentTypes(userId) {
  await query(
    `INSERT INTO payment_types (user_id, name, is_protected)
     VALUES ($1, 'Cash', TRUE), ($1, 'UPI', TRUE)
     ON CONFLICT (user_id, name)
     DO UPDATE SET is_protected = TRUE`,
    [userId]
  );
}

paymentTypesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    await ensureDefaultPaymentTypes(req.user.id);
    const result = await query(
      `SELECT id, name, is_protected AS "isProtected"
       FROM payment_types
       WHERE user_id = $1
       ORDER BY is_protected DESC, name ASC`,
      [req.user.id]
    );
    res.json({ paymentTypes: result.rows });
  } catch (error) {
    next(error);
  }
});

paymentTypesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = paymentTypeSchema.parse(req.body);
    const result = await query(
      `INSERT INTO payment_types (user_id, name)
       VALUES ($1, $2)
       ON CONFLICT (user_id, name)
       DO UPDATE SET updated_at = NOW()
       RETURNING id, name, is_protected AS "isProtected"`,
      [req.user.id, input.name]
    );
    res.status(201).json({ paymentType: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

paymentTypesRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT id, name, is_protected AS "isProtected" FROM payment_types WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    const paymentType = existing.rows[0];
    if (!paymentType) return res.status(404).json({ message: 'Payment type not found' });
    if (paymentType.isProtected) return res.status(400).json({ message: 'Cash and UPI cannot be deleted' });

    await query('DELETE FROM payment_types WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
