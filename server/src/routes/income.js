import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { assertMonth, currentMonth } from '../utils/month.js';
import { incomeSchema } from '../validation.js';

export const incomeRouter = express.Router();

incomeRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const month = assertMonth(req.query.month || currentMonth());
    const result = await query(
      `SELECT
         id,
         source,
         planned_amount AS "plannedAmount",
         actual_amount AS "actualAmount"
       FROM incomes
       WHERE user_id = $1 AND month = $2
       ORDER BY created_at ASC`,
      [req.user.id, month]
    );

    const incomes = result.rows.map((row) => ({
      ...row,
      plannedAmount: Number(row.plannedAmount),
      actualAmount: Number(row.actualAmount)
    }));

    res.json({
      month,
      income: incomes[0] || null,
      totalPlanned: incomes.reduce((sum, row) => sum + row.plannedAmount, 0),
      totalActual: incomes.reduce((sum, row) => sum + row.actualAmount, 0)
    });
  } catch (error) {
    next(error);
  }
});

incomeRouter.put('/', requireAuth, async (req, res, next) => {
  try {
    const input = incomeSchema.parse(req.body);
    const actualAmount = input.actualAmount ?? input.plannedAmount;
    const result = await query(
      `WITH existing AS (
         SELECT id
         FROM incomes
         WHERE user_id = $1 AND month = $2
         ORDER BY created_at ASC
         LIMIT 1
       ),
       updated AS (
         UPDATE incomes
         SET
           source = $3,
           planned_amount = $4,
           actual_amount = $5,
           updated_at = NOW()
         WHERE id IN (SELECT id FROM existing)
         RETURNING id, month, source, planned_amount AS "plannedAmount", actual_amount AS "actualAmount"
       ),
       inserted AS (
         INSERT INTO incomes (user_id, month, source, planned_amount, actual_amount)
         SELECT $1, $2, $3, $4, $5
         WHERE NOT EXISTS (SELECT 1 FROM updated)
         RETURNING id, month, source, planned_amount AS "plannedAmount", actual_amount AS "actualAmount"
       )
       SELECT * FROM updated
       UNION ALL
       SELECT * FROM inserted`,
      [req.user.id, input.month, input.source, input.plannedAmount, actualAmount]
    );

    const income = result.rows[0];
    res.json({
      income: {
        ...income,
        plannedAmount: Number(income.plannedAmount),
        actualAmount: Number(income.actualAmount)
      }
    });
  } catch (error) {
    next(error);
  }
});
