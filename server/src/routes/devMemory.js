import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import express from 'express';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import {
  budgetSchema,
  categorySchema,
  copyBudgetSchema,
  expenseSchema,
  expenseUpdateSchema,
  forgotPasswordSchema,
  incomeSchema,
  loginSchema,
  passwordUpdateSchema,
  profileUpdateSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from '../validation.js';
import { assertMonth, currentMonth } from '../utils/month.js';

const router = express.Router();
const users = [];
const categories = [];
const budgets = [];
const expenses = [];
const incomes = [];
const otps = [];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workbookPath = path.join(__dirname, '..', '..', '..', 'SmartBudgetPlanner.xlsx');

const money = (value) => Number(value || 0);

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, config.jwtSecret, {
    expiresIn: config.tokenExpiresIn
  });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phoneCountryCode: user.phoneCountryCode,
    phoneNumber: user.phoneNumber,
    city: user.city,
    emailVerified: user.emailVerified,
    role: user.role || 'user',
    createdAt: user.createdAt
  };
}

function createDevOtp(userId, email, purpose) {
  const otp = '123456';
  otps.push({
    id: randomUUID(),
    userId,
    purpose,
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    consumed: false
  });
  console.log(`[DEV OTP] ${purpose} for ${email}: ${otp}`);
}

function verifyDevOtp(userId, purpose, otp) {
  const record = [...otps]
    .reverse()
    .find((item) => item.userId === userId && item.purpose === purpose && !item.consumed && item.expiresAt > Date.now());
  if (!record || record.otp !== otp) return false;
  record.consumed = true;
  return true;
}

function findUser(id) {
  return users.find((user) => user.id === id);
}

function getMonthBudget(userId, categoryId, month) {
  return budgets.find((item) => item.userId === userId && item.categoryId === categoryId && item.month === month);
}

function dashboardFor(userId, rawMonth) {
  const month = assertMonth(rawMonth || currentMonth());
  const activeCategories = categories
    .filter((category) => category.userId === userId && !category.isArchived)
    .sort((a, b) => {
      const order = { Needs: 1, Wants: 2, Savings: 3 };
      return order[a.groupName] - order[b.groupName] || a.name.localeCompare(b.name);
    });

  const categoryRows = activeCategories.map((category) => {
    const budget = getMonthBudget(userId, category.id, month);
    const planned = money(budget?.plannedAmount ?? category.defaultBudget);
    const actual = expenses
      .filter((expense) => expense.userId === userId && expense.categoryId === category.id && expense.date.startsWith(month))
      .reduce((sum, expense) => sum + expense.amount, 0);
    return {
      id: category.id,
      name: category.name,
      groupName: category.groupName,
      planned,
      actual,
      difference: planned - actual,
      usedPercent: planned > 0 ? Math.round((actual / planned) * 100) : 0
    };
  });

  const monthIncome = incomes.filter((item) => item.userId === userId && item.month === month);
  const totalPlanned = categoryRows.reduce((sum, row) => sum + row.planned, 0);
  const plannedIncome = monthIncome.reduce((sum, item) => sum + item.plannedAmount, 0);
  const actualIncome = monthIncome.reduce((sum, item) => sum + item.actualAmount, 0);
  const totalBudget = plannedIncome || actualIncome || totalPlanned;
  const totalSpent = categoryRows.reduce((sum, row) => sum + row.actual, 0);
  const remaining = totalBudget - totalSpent;

  const groupSummary = ['Needs', 'Wants', 'Savings'].map((groupName) => {
    const rows = categoryRows.filter((row) => row.groupName === groupName);
    const planned = rows.reduce((sum, row) => sum + row.planned, 0);
    const actual = rows.reduce((sum, row) => sum + row.actual, 0);
    return {
      groupName,
      targetPercent: groupName === 'Needs' ? 50 : groupName === 'Wants' ? 30 : 20,
      planned,
      actual,
      plannedPercent: totalPlanned > 0 ? (planned / totalPlanned) * 100 : 0,
      actualPercent: totalSpent > 0 ? (actual / totalSpent) * 100 : 0,
      difference: planned - actual
    };
  });

  const recentExpenses = expenses
    .filter((expense) => expense.userId === userId && expense.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((expense) => {
      const category = categories.find((item) => item.id === expense.categoryId);
      return {
        id: expense.id,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        description: expense.description,
        date: expense.date,
        categoryName: category?.name,
        groupName: category?.groupName
      };
    });

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
      emergencyFundOneYear: (groupSummary.find((row) => row.groupName === 'Needs')?.planned || 0) * 12
    },
    groupSummary,
    categories: categoryRows,
    recentExpenses,
    paymentMethods: Object.values(
      expenses
        .filter((expense) => expense.userId === userId && expense.date.startsWith(month))
        .reduce((acc, expense) => {
          acc[expense.paymentMethod] ||= { name: expense.paymentMethod, value: 0 };
          acc[expense.paymentMethod].value += expense.amount;
          return acc;
        }, {})
    ),
    alerts: categoryRows
      .filter((row) => row.planned > 0 && row.actual / row.planned >= 0.85)
      .map((row) => ({
        categoryId: row.id,
        categoryName: row.name,
        severity: row.actual > row.planned ? 'over' : 'near',
        message: row.actual > row.planned ? `${row.name} is over budget` : `${row.name} is near the budget limit`
      }))
  };
}

async function loadWorkbookCategories() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const sheet = workbook.worksheets[0];
  const ranges = [
    { groupName: 'Needs', nameCol: 2, amountCol: 3, start: 21, end: 35 },
    { groupName: 'Wants', nameCol: 7, amountCol: 8, start: 21, end: 35 },
    { groupName: 'Savings', nameCol: 12, amountCol: 13, start: 21, end: 35 }
  ];

  return ranges.flatMap((range) => {
    const rows = [];
    for (let row = range.start; row <= range.end; row += 1) {
      const name = sheet.getCell(row, range.nameCol).value;
      const amount = sheet.getCell(row, range.amountCol).value;
      if (typeof name === 'string' && name.trim()) {
        rows.push({ name: name.trim(), groupName: range.groupName, plannedAmount: Number(amount || 0) });
      }
    }
    return rows;
  });
}

export async function seedDevMemory() {
  if (users.length) return;
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const user = {
    id: randomUUID(),
    email: 'demo@budget.local',
    passwordHash,
    name: 'Demo User',
    phoneCountryCode: '+91',
    phoneNumber: '',
    city: 'Pune',
    emailVerified: true,
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  users.push(user);

  const month = '2026-04';
  const workbookCategories = await loadWorkbookCategories();
  for (const item of workbookCategories) {
    const category = {
      id: randomUUID(),
      userId: user.id,
      name: item.name,
      groupName: item.groupName,
      defaultBudget: item.plannedAmount,
      isArchived: false
    };
    categories.push(category);
    budgets.push({
      id: randomUUID(),
      userId: user.id,
      categoryId: category.id,
      month,
      plannedAmount: item.plannedAmount
    });
  }

  incomes.push({
    id: randomUUID(),
    userId: user.id,
    month,
    source: 'Demo income',
    plannedAmount: 75300,
    actualAmount: 58300
  });
}

router.post('/auth/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    if (users.some((user) => user.email === input.email)) {
      return res.status(409).json({ message: 'A record with this value already exists' });
    }
    const user = {
      id: randomUUID(),
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      name: input.name || null,
      phoneCountryCode: input.phoneCountryCode || null,
      phoneNumber: input.phoneNumber || null,
      city: input.city || null,
      emailVerified: false,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    users.push(user);
    createDevOtp(user.id, user.email, 'verify_email');
    res.status(201).json({ message: 'Verification OTP sent', email: user.email });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = users.find((item) => item.email === input.email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.emailVerified) {
      createDevOtp(user.id, user.email, 'verify_email');
      return res.status(403).json({
        message: 'Email verification required',
        code: 'EMAIL_VERIFICATION_REQUIRED',
        email: user.email
      });
    }
    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(findUser(req.user.id)) });
});

router.post('/auth/verify-email', (req, res, next) => {
  try {
    const input = verifyEmailSchema.parse(req.body);
    const user = users.find((item) => item.email === input.email);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!verifyDevOtp(user.id, 'verify_email', input.otp)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    user.emailVerified = true;
    res.json({ user: publicUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/resend-verification-otp', (req, res, next) => {
  try {
    const input = resendOtpSchema.parse(req.body);
    const user = users.find((item) => item.email === input.email);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.json({ message: 'Email already verified' });
    createDevOtp(user.id, user.email, 'verify_email');
    res.json({ message: 'Verification OTP sent' });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/forgot-password', (req, res, next) => {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    const user = users.find((item) => item.email === input.email);
    if (user) createDevOtp(user.id, user.email, 'reset_password');
    res.json({ message: 'If the email exists, a reset OTP has been sent' });
  } catch (error) {
    next(error);
  }
});

router.post('/auth/reset-password', async (req, res, next) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    const user = users.find((item) => item.email === input.email);
    if (!user || !verifyDevOtp(user.id, 'reset_password', input.otp)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    user.passwordHash = await bcrypt.hash(input.newPassword, 12);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
});

router.put('/auth/profile', requireAuth, (req, res, next) => {
  try {
    const input = profileUpdateSchema.parse(req.body);
    const user = findUser(req.user.id);
    user.name = input.name ?? user.name;
    user.city = input.city ?? user.city;
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.put('/auth/password', requireAuth, async (req, res, next) => {
  try {
    const input = passwordUpdateSchema.parse(req.body);
    const user = findUser(req.user.id);
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    user.passwordHash = await bcrypt.hash(input.newPassword, 12);
    res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard', requireAuth, (req, res, next) => {
  try {
    res.json(dashboardFor(req.user.id, req.query.month));
  } catch (error) {
    next(error);
  }
});

router.get('/income', requireAuth, (req, res, next) => {
  try {
    const month = assertMonth(req.query.month || currentMonth());
    const rows = incomes.filter((item) => item.userId === req.user.id && item.month === month);
    res.json({
      month,
      income: rows[0] || null,
      totalPlanned: rows.reduce((sum, row) => sum + row.plannedAmount, 0),
      totalActual: rows.reduce((sum, row) => sum + row.actualAmount, 0)
    });
  } catch (error) {
    next(error);
  }
});

router.put('/income', requireAuth, (req, res, next) => {
  try {
    const input = incomeSchema.parse(req.body);
    let income = incomes.find((item) => item.userId === req.user.id && item.month === input.month);
    if (!income) {
      income = { id: randomUUID(), userId: req.user.id, month: input.month };
      incomes.push(income);
    }
    income.source = input.source;
    income.plannedAmount = input.plannedAmount;
    income.actualAmount = input.actualAmount ?? input.plannedAmount;
    res.json({ income });
  } catch (error) {
    next(error);
  }
});

router.get('/categories', requireAuth, (req, res, next) => {
  try {
    const month = assertMonth(req.query.month || currentMonth());
    res.json({
      month,
      categories: categories
        .filter((category) => category.userId === req.user.id)
        .map((category) => {
          const budget = getMonthBudget(req.user.id, category.id, month);
          const actualAmount = expenses
            .filter((expense) => expense.userId === req.user.id && expense.categoryId === category.id && expense.date.startsWith(month))
            .reduce((sum, expense) => sum + expense.amount, 0);
          return {
            ...category,
            defaultBudget: category.defaultBudget,
            plannedAmount: money(budget?.plannedAmount ?? category.defaultBudget),
            actualAmount
          };
        })
    });
  } catch (error) {
    next(error);
  }
});

router.post('/category', requireAuth, (req, res, next) => {
  try {
    const input = categorySchema.parse(req.body);
    const category = {
      id: randomUUID(),
      userId: req.user.id,
      name: input.name,
      groupName: input.groupName,
      defaultBudget: input.defaultBudget,
      isArchived: false
    };
    categories.push(category);
    budgets.push({
      id: randomUUID(),
      userId: req.user.id,
      categoryId: category.id,
      month: input.month || currentMonth(),
      plannedAmount: input.plannedAmount ?? input.defaultBudget
    });
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

router.put('/category/:id/budget', requireAuth, (req, res, next) => {
  try {
    const input = budgetSchema.parse(req.body);
    const category = categories.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    let budget = getMonthBudget(req.user.id, category.id, input.month);
    if (!budget) {
      budget = { id: randomUUID(), userId: req.user.id, categoryId: category.id, month: input.month, plannedAmount: input.plannedAmount };
      budgets.push(budget);
    } else {
      budget.plannedAmount = input.plannedAmount;
    }
    res.json({ budget });
  } catch (error) {
    next(error);
  }
});

router.delete('/category/:id', requireAuth, (req, res) => {
  const index = categories.findIndex((item) => item.id === req.params.id && item.userId === req.user.id);
  if (index === -1) return res.status(404).json({ message: 'Category not found' });
  if (expenses.some((expense) => expense.categoryId === req.params.id && expense.userId === req.user.id)) {
    return res.status(400).json({ message: 'Delete expenses in this category before deleting it' });
  }
  categories.splice(index, 1);
  res.status(204).send();
});

router.post('/budgets/copy', requireAuth, (req, res, next) => {
  try {
    const input = copyBudgetSchema.parse(req.body);
    budgets
      .filter((budget) => budget.userId === req.user.id && budget.month === input.fromMonth)
      .forEach((budget) => {
        const existing = getMonthBudget(req.user.id, budget.categoryId, input.toMonth);
        if (existing) existing.plannedAmount = budget.plannedAmount;
        else budgets.push({ ...budget, id: randomUUID(), month: input.toMonth });
      });
    res.status(201).json({ message: 'Budget copied', fromMonth: input.fromMonth, toMonth: input.toMonth });
  } catch (error) {
    next(error);
  }
});

router.get('/expenses', requireAuth, (req, res, next) => {
  try {
    const month = assertMonth(req.query.month || currentMonth());
    res.json({
      month,
      expenses: expenses
        .filter((expense) => expense.userId === req.user.id && expense.date.startsWith(month))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .map((expense) => {
          const category = categories.find((item) => item.id === expense.categoryId);
          return { ...expense, categoryName: category?.name, groupName: category?.groupName };
        })
    });
  } catch (error) {
    next(error);
  }
});

router.post('/expense', requireAuth, (req, res, next) => {
  try {
    const input = expenseSchema.parse(req.body);
    const category = categories.find((item) => item.id === input.categoryId && item.userId === req.user.id && !item.isArchived);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    const expense = {
      id: randomUUID(),
      userId: req.user.id,
      categoryId: input.categoryId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      description: input.description || null,
      date: input.date,
      createdAt: new Date().toISOString()
    };
    expenses.push(expense);
    res.status(201).json({ expense });
  } catch (error) {
    next(error);
  }
});

router.put('/expense/:id', requireAuth, (req, res, next) => {
  try {
    const input = expenseUpdateSchema.parse(req.body);
    const expense = expenses.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    Object.assign(expense, {
      categoryId: input.categoryId ?? expense.categoryId,
      amount: input.amount ?? expense.amount,
      paymentMethod: input.paymentMethod ?? expense.paymentMethod,
      description: input.description ?? expense.description,
      date: input.date ?? expense.date
    });
    res.json({ expense });
  } catch (error) {
    next(error);
  }
});

router.delete('/expense/:id', requireAuth, (req, res) => {
  const index = expenses.findIndex((item) => item.id === req.params.id && item.userId === req.user.id);
  if (index === -1) return res.status(404).json({ message: 'Expense not found' });
  expenses.splice(index, 1);
  res.status(204).send();
});

router.get('/export/excel', requireAuth, async (req, res, next) => {
  try {
    const dashboard = dashboardFor(req.user.id, req.query.month);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(dashboard.month);
    sheet.addRow([`Smart Budget Planner - ${dashboard.month}`]);
    sheet.mergeCells('A1:F1');
    sheet.addRow([]);
    sheet.addRow(['Category', 'Group', 'Planned', 'Actual', 'Difference', 'Used %']);
    dashboard.categories.forEach((item) => {
      sheet.addRow([item.name, item.groupName, item.planned, item.actual, item.difference, item.usedPercent / 100]);
    });
    sheet.columns = [{ width: 32 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 12 }];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="smart-budget-${dashboard.month}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});

export const devMemoryRouter = router;
