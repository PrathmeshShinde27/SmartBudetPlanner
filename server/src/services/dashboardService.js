import { query } from '../db.js';
import { assertMonth, currentMonth } from '../utils/month.js';

const money = (value) => Number(value || 0);

export async function getDashboard(userId, requestedMonth) {
  const month = assertMonth(requestedMonth || currentMonth());

  const [incomeResult, categoryResult, expenseResult, paymentResult, weeklyResult] = await Promise.all([
    query(
      `SELECT
         COALESCE(SUM(planned_amount), 0) AS planned_income,
         COALESCE(SUM(actual_amount), 0) AS actual_income
       FROM incomes
       WHERE user_id = $1 AND month = $2`,
      [userId, month]
    ),
    query(
      `SELECT
         c.id,
         c.name,
         c.group_name AS "groupName",
         COALESCE(mb.planned_amount, c.default_budget, 0) AS planned,
         COALESCE(SUM(e.amount), 0) AS actual
       FROM categories c
       LEFT JOIN monthly_budgets mb
         ON mb.category_id = c.id
        AND mb.user_id = c.user_id
        AND mb.month = $2
       LEFT JOIN expenses e
         ON e.category_id = c.id
        AND e.user_id = c.user_id
        AND to_char(e.expense_date, 'YYYY-MM') = $2
       WHERE c.user_id = $1 AND c.is_archived = FALSE
       GROUP BY c.id, c.name, c.group_name, mb.id, mb.planned_amount, c.default_budget
       HAVING mb.id IS NOT NULL OR COUNT(e.id) > 0
       ORDER BY
         CASE c.group_name WHEN 'Needs' THEN 1 WHEN 'Wants' THEN 2 ELSE 3 END,
         c.name`,
      [userId, month]
    ),
    query(
      `SELECT
         e.id,
         e.amount,
         e.payment_method AS "paymentMethod",
         e.description,
         e.expense_date::text AS "date",
         e.bill_date::text AS "billDate",
         c.name AS "categoryName",
         c.group_name AS "bucketName"
       FROM expenses e
       JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = $1 AND to_char(e.expense_date, 'YYYY-MM') = $2
       ORDER BY e.expense_date DESC, e.created_at DESC
       LIMIT 8`,
      [userId, month]
    ),
    query(
      `SELECT payment_method AS name, COALESCE(SUM(amount), 0) AS value
       FROM expenses
       WHERE user_id = $1 AND to_char(expense_date, 'YYYY-MM') = $2
       GROUP BY payment_method
       ORDER BY value DESC`,
      [userId, month]
    ),
    query(
      `SELECT
         date_trunc('week', bill_date)::date::text AS week_start,
         COALESCE(SUM(amount), 0) AS actual
       FROM expenses
       WHERE user_id = $1 AND to_char(expense_date, 'YYYY-MM') = $2
       GROUP BY week_start
       ORDER BY week_start`,
      [userId, month]
    )
  ]);

  const income = incomeResult.rows[0] || {};
  const categories = categoryResult.rows.map((row) => {
    const planned = money(row.planned);
    const actual = money(row.actual);
    return {
      ...row,
      planned,
      actual,
      difference: planned - actual,
      usedPercent: planned > 0 ? Math.round((actual / planned) * 100) : 0
    };
  });

  const totalPlanned = categories.reduce((sum, row) => sum + row.planned, 0);
  const plannedIncome = money(income.planned_income);
  const actualIncome = money(income.actual_income);
  const totalBudget = plannedIncome || actualIncome || totalPlanned;
  const totalSpent = categories.reduce((sum, row) => sum + row.actual, 0);
  const remaining = totalBudget - totalSpent;

  const groupSummary = ['Needs', 'Wants', 'Savings'].map((groupName) => {
    const rows = categories.filter((row) => row.groupName === groupName);
    const planned = rows.reduce((sum, row) => sum + row.planned, 0);
    const actual = rows.reduce((sum, row) => sum + row.actual, 0);
    const targetPercent = groupName === 'Needs' ? 50 : groupName === 'Wants' ? 30 : 20;
    return {
      groupName,
      targetPercent,
      planned,
      actual,
      plannedPercent: totalPlanned > 0 ? (planned / totalPlanned) * 100 : 0,
      actualPercent: totalSpent > 0 ? (actual / totalSpent) * 100 : 0,
      difference: planned - actual
    };
  });

  const alerts = categories
    .filter((row) => row.planned > 0 && row.actual > row.planned)
    .map((row) => ({
      categoryId: row.id,
      categoryName: row.name,
      severity: 'over',
      message: `${row.name} is over budget`
    }));

  return {
    month,
    totals: {
      plannedIncome,
      actualIncome,
      totalBudget,
      totalPlanned,
      totalSpent,
      remaining,
      savings: Math.max(remaining, 0),
      emergencyFundOneYear: groupSummary.find((g) => g.groupName === 'Needs').planned * 12
    },
    groupSummary,
    categories,
    recentExpenses: expenseResult.rows.map((row) => ({ ...row, amount: money(row.amount) })),
    paymentMethods: paymentResult.rows.map((row) => ({ name: row.name, value: money(row.value) })),
    weeklyAnalysis: buildWeeklyAnalysis(categories, month, weeklyResult.rows),
    alerts
  };
}

export async function getWeeklyAnalysis(userId, requestedWeekStart) {
  const weekStart = assertWeekStart(requestedWeekStart);
  const weekEnd = addDays(weekStart, 6);
  const result = await query(
    `SELECT COALESCE(SUM(amount), 0) AS actual
     FROM expenses
     WHERE user_id = $1
       AND bill_date >= $2::date
       AND bill_date <= $3::date`,
    [userId, formatDate(weekStart), formatDate(weekEnd)]
  );

  return {
    startDate: formatDate(weekStart),
    endDate: formatDate(weekEnd),
    actual: money(result.rows[0]?.actual)
  };
}

function buildWeeklyAnalysis(categories, month, weeklyRows = []) {
  const monthStart = new Date(`${month}-01T00:00:00Z`);
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const totalDays = Math.round((monthEnd - monthStart) / 86400000) + 1;
  const totalPlanned = categories.reduce((sum, row) => sum + row.planned, 0);
  const actualByWeek = new Map(weeklyRows.map((row) => [row.week_start, money(row.actual)]));
  const firstWeekStart = new Date(monthStart);
  firstWeekStart.setUTCDate(monthStart.getUTCDate() - ((monthStart.getUTCDay() + 6) % 7));

  const weeks = [];
  for (let weekStart = new Date(firstWeekStart), index = 0; weekStart <= monthEnd; weekStart.setUTCDate(weekStart.getUTCDate() + 7), index += 1) {
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    const overlapStart = weekStart > monthStart ? weekStart : monthStart;
    const overlapEnd = weekEnd < monthEnd ? weekEnd : monthEnd;
    const overlapDays = Math.round((overlapEnd - overlapStart) / 86400000) + 1;
    const ratio = overlapDays / totalDays;
    const planned = totalPlanned * ratio;
    const actual = actualByWeek.get(weekStart.toISOString().slice(0, 10)) || 0;
    weeks.push({
      name: `Week: ${weekStart.toISOString().slice(0, 10)} - ${weekEnd.toISOString().slice(0, 10)}`,
      startDate: weekStart.toISOString().slice(0, 10),
      endDate: weekEnd.toISOString().slice(0, 10),
      planned,
      actual,
      difference: planned - actual
    });
  }
  return weeks;
}

function assertWeekStart(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    const error = new Error('Week start must use YYYY-MM-DD format');
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || formatDate(date) !== value) {
    const error = new Error('Week start must be a valid date');
    error.status = 400;
    error.expose = true;
    throw error;
  }

  return startOfWeek(date);
}

function startOfWeek(date) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() - ((result.getUTCDay() + 6) % 7));
  return result;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}
