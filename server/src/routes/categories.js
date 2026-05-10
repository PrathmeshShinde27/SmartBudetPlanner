import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { assertMonth, currentMonth } from '../utils/month.js';
import { budgetSchema, categorySchema, categoryUpdateSchema, copyBudgetSchema } from '../validation.js';

export const categoriesRouter = express.Router();
export const budgetsRouter = express.Router();

categoriesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const month = assertMonth(req.query.month || currentMonth());
    const result = await query(
      `SELECT
         c.id,
         c.name,
         c.group_name AS "groupName",
         c.default_budget AS "defaultBudget",
         c.is_archived AS "isArchived",
         COALESCE(mb.planned_amount, c.default_budget, 0) AS "plannedAmount",
         COALESCE(SUM(e.amount), 0) AS "actualAmount"
       FROM categories c
       LEFT JOIN monthly_budgets mb
         ON mb.category_id = c.id AND mb.user_id = c.user_id AND mb.month = $2
       LEFT JOIN expenses e
         ON e.category_id = c.id AND e.user_id = c.user_id AND to_char(e.expense_date, 'YYYY-MM') = $2
       WHERE c.user_id = $1
       GROUP BY c.id, mb.id, mb.planned_amount
       HAVING mb.id IS NOT NULL OR COUNT(e.id) > 0
       ORDER BY c.is_archived ASC,
         CASE c.group_name WHEN 'Needs' THEN 1 WHEN 'Wants' THEN 2 ELSE 3 END,
         c.name`,
      [req.user.id, month]
    );
    res.json({ month, categories: result.rows.map((row) => ({
      ...row,
      defaultBudget: Number(row.defaultBudget),
      plannedAmount: Number(row.plannedAmount),
      actualAmount: Number(row.actualAmount)
    })) });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const input = categorySchema.parse(req.body);
    const category = await withTransaction(async (client) => {
      const existing = await client.query(
        `SELECT id, name, group_name AS "groupName", default_budget AS "defaultBudget"
         FROM categories
         WHERE user_id = $1 AND lower(name) = lower($2)
         LIMIT 1`,
        [req.user.id, input.name]
      );
      const created = existing.rows[0] || (await client.query(
        `INSERT INTO categories (user_id, name, group_name, default_budget)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, group_name AS "groupName", default_budget AS "defaultBudget"`,
        [req.user.id, input.name, input.groupName, input.defaultBudget]
      )).rows[0];
      const month = input.month || currentMonth();
      await client.query(
        `INSERT INTO monthly_budgets (user_id, category_id, month, planned_amount)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, category_id, month)
         DO UPDATE SET planned_amount = EXCLUDED.planned_amount, updated_at = NOW()`,
        [req.user.id, created.id, month, input.plannedAmount ?? input.defaultBudget]
      );
      return created;
    });

    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const input = categoryUpdateSchema.parse(req.body);
    const result = await query(
      `UPDATE categories
       SET
         name = COALESCE($3, name),
         group_name = COALESCE($4, group_name),
         default_budget = COALESCE($5, default_budget),
         is_archived = COALESCE($6, is_archived),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, name, group_name AS "groupName", default_budget AS "defaultBudget", is_archived AS "isArchived"`,
      [req.params.id, req.user.id, input.name, input.groupName, input.defaultBudget, input.isArchived]
    );

    if (!result.rows[0]) return res.status(404).json({ message: 'Category not found' });
    res.json({ category: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const month = assertMonth(req.query.month || currentMonth());
    const category = await query('SELECT id FROM categories WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (!category.rows[0]) return res.status(404).json({ message: 'Category not found' });

    const expenses = await query(
      `SELECT COUNT(*)::int AS total
       FROM expenses
       WHERE category_id = $1 AND user_id = $2 AND to_char(expense_date, 'YYYY-MM') = $3`,
      [req.params.id, req.user.id, month]
    );
    if (expenses.rows[0].total > 0) {
      return res.status(400).json({ message: 'Delete expenses in this category before deleting it from this month' });
    }

    await query('DELETE FROM monthly_budgets WHERE category_id = $1 AND user_id = $2 AND month = $3', [
      req.params.id,
      req.user.id,
      month
    ]);

    const usage = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM monthly_budgets WHERE category_id = $1 AND user_id = $2) AS budgets,
         (SELECT COUNT(*)::int FROM expenses WHERE category_id = $1 AND user_id = $2) AS expenses`,
      [req.params.id, req.user.id]
    );
    if (usage.rows[0].budgets === 0 && usage.rows[0].expenses === 0) {
      await query('DELETE FROM categories WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    }

    res.status(204).send();
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ message: 'Delete expenses in this category before deleting it' });
    }
    next(error);
  }
});

categoriesRouter.put('/:id/budget', requireAuth, async (req, res, next) => {
  try {
    const input = budgetSchema.parse(req.body);
    const category = await query('SELECT id FROM categories WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (!category.rows[0]) return res.status(404).json({ message: 'Category not found' });

    const result = await query(
      `INSERT INTO monthly_budgets (user_id, category_id, month, planned_amount)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, category_id, month)
       DO UPDATE SET planned_amount = EXCLUDED.planned_amount, updated_at = NOW()
       RETURNING id, category_id AS "categoryId", month, planned_amount AS "plannedAmount"`,
      [req.user.id, req.params.id, input.month, input.plannedAmount]
    );
    res.json({ budget: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

budgetsRouter.post('/copy', requireAuth, async (req, res, next) => {
  try {
    const input = copyBudgetSchema.parse(req.body);
    await query(
      `INSERT INTO monthly_budgets (user_id, category_id, month, planned_amount)
       SELECT user_id, category_id, $3, planned_amount
       FROM monthly_budgets
       WHERE user_id = $1 AND month = $2
       ON CONFLICT (user_id, category_id, month)
       DO UPDATE SET planned_amount = EXCLUDED.planned_amount, updated_at = NOW()`,
      [req.user.id, input.fromMonth, input.toMonth]
    );
    res.status(201).json({ message: 'Budget copied', fromMonth: input.fromMonth, toMonth: input.toMonth });
  } catch (error) {
    next(error);
  }
});
