import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { assertMonth, currentMonth } from '../utils/month.js';
import { expenseSchema, expenseUpdateSchema } from '../validation.js';

export const expensesRouter = express.Router();
export const singleExpenseRouter = express.Router();

expensesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const month = assertMonth(req.query.month || currentMonth());
    const result = await query(
      `SELECT
         e.id,
         e.category_id AS "categoryId",
         c.name AS "categoryName",
         c.group_name AS "groupName",
         e.amount,
         e.payment_method AS "paymentMethod",
         e.description,
         e.expense_date::text AS "date",
         e.created_at AS "createdAt"
       FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1 AND to_char(e.expense_date, 'YYYY-MM') = $2
       ORDER BY e.expense_date DESC, e.created_at DESC`,
      [req.user.id, month]
    );
    res.json({
      month,
      expenses: result.rows.map((row) => ({ ...row, amount: Number(row.amount) }))
    });
  } catch (error) {
    next(error);
  }
});

singleExpenseRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = expenseSchema.parse(req.body);
    const result = await query(
      `INSERT INTO expenses (user_id, category_id, amount, payment_method, description, expense_date)
       SELECT $1, c.id, $3, $4, $5, $6
       FROM categories c
       WHERE c.id = $2 AND c.user_id = $1 AND c.is_archived = FALSE
       RETURNING id, category_id AS "categoryId", amount, payment_method AS "paymentMethod", description, expense_date::text AS "date"`,
      [req.user.id, input.categoryId, input.amount, input.paymentMethod, input.description || null, input.date]
    );

    if (!result.rows[0]) return res.status(404).json({ message: 'Category not found' });
    res.status(201).json({ expense: { ...result.rows[0], amount: Number(result.rows[0].amount) } });
  } catch (error) {
    next(error);
  }
});

singleExpenseRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const input = expenseUpdateSchema.parse(req.body);

    if (input.categoryId) {
      const category = await query('SELECT id FROM categories WHERE id = $1 AND user_id = $2', [
        input.categoryId,
        req.user.id
      ]);
      if (!category.rows[0]) return res.status(404).json({ message: 'Category not found' });
    }

    const result = await query(
      `UPDATE expenses
       SET
         category_id = COALESCE($3, category_id),
         amount = COALESCE($4, amount),
         payment_method = COALESCE($5, payment_method),
         description = COALESCE($6, description),
         expense_date = COALESCE($7, expense_date),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, category_id AS "categoryId", amount, payment_method AS "paymentMethod", description, expense_date::text AS "date"`,
      [
        req.params.id,
        req.user.id,
        input.categoryId,
        input.amount,
        input.paymentMethod,
        input.description,
        input.date
      ]
    );

    if (!result.rows[0]) return res.status(404).json({ message: 'Expense not found' });
    res.json({ expense: { ...result.rows[0], amount: Number(result.rows[0].amount) } });
  } catch (error) {
    next(error);
  }
});

singleExpenseRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING id', [
      req.params.id,
      req.user.id
    ]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Expense not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
