import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128)
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1)
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  groupName: z.enum(['Needs', 'Wants', 'Savings']).default('Needs'),
  defaultBudget: z.coerce.number().min(0).default(0),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  plannedAmount: z.coerce.number().min(0).optional()
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  groupName: z.enum(['Needs', 'Wants', 'Savings']).optional(),
  defaultBudget: z.coerce.number().min(0).optional(),
  isArchived: z.boolean().optional()
});

export const budgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  plannedAmount: z.coerce.number().min(0)
});

export const copyBudgetSchema = z.object({
  fromMonth: z.string().regex(/^\d{4}-\d{2}$/),
  toMonth: z.string().regex(/^\d{4}-\d{2}$/)
});

export const expenseSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  paymentMethod: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const expenseUpdateSchema = expenseSchema.partial();
