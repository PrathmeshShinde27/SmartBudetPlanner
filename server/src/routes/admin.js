import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { getDashboard } from '../services/dashboardService.js';
import { assertMonth, currentMonth } from '../utils/month.js';

export const adminRouter = express.Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/users', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         u.id,
         u.email,
         u.name,
         u.phone_country_code AS "phoneCountryCode",
         u.phone_number AS "phoneNumber",
         u.city,
         u.email_verified AS "emailVerified",
         u.role,
         u.created_at AS "createdAt",
         COALESCE(category_counts.total, 0) AS "categoryCount",
         COALESCE(expense_counts.total, 0) AS "expenseCount"
       FROM users u
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS total
         FROM categories
         GROUP BY user_id
       ) category_counts ON category_counts.user_id = u.id
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS total
         FROM expenses
         GROUP BY user_id
       ) expense_counts ON expense_counts.user_id = u.id
       ORDER BY u.created_at DESC`,
      []
    );
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/users/:userId/dashboard', async (req, res, next) => {
  try {
    const dashboard = await getDashboard(req.params.userId, req.query.month);
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/users/:userId/categories', async (req, res, next) => {
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
       GROUP BY c.id, mb.planned_amount
       ORDER BY c.is_archived ASC,
         CASE c.group_name WHEN 'Needs' THEN 1 WHEN 'Wants' THEN 2 ELSE 3 END,
         c.name`,
      [req.params.userId, month]
    );
    res.json({
      month,
      categories: result.rows.map((row) => ({
        ...row,
        defaultBudget: Number(row.defaultBudget),
        plannedAmount: Number(row.plannedAmount),
        actualAmount: Number(row.actualAmount)
      }))
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/users/:userId/expenses', async (req, res, next) => {
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
      [req.params.userId, month]
    );
    res.json({
      month,
      expenses: result.rows.map((row) => ({ ...row, amount: Number(row.amount) }))
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/users/:userId', async (req, res, next) => {
  try {
    if (req.params.userId === req.user.id) {
      return res.status(400).json({ message: 'Admin cannot delete their own account' });
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.userId]);
    if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
