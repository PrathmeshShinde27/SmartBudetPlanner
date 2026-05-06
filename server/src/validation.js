import { z } from 'zod';

const passwordMessage = 'Password must be 8+ characters and include at least one letter, one number, and one special character';
const strongPasswordSchema = z
  .string()
  .min(8, passwordMessage)
  .max(128)
  .regex(/[A-Za-z]/, passwordMessage)
  .regex(/[0-9]/, passwordMessage)
  .regex(/[^A-Za-z0-9]/, passwordMessage);

export const registerSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().toLowerCase(),
  phoneCountryCode: z.string().trim().max(8).optional(),
  phoneNumber: z.string().trim().max(20).optional(),
  city: z.string().trim().max(120).optional(),
  password: strongPasswordSchema
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1)
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  otp: z.string().trim().regex(/^\d{6}$/)
});

export const resendOtpSchema = z.object({
  email: z.string().trim().email().toLowerCase()
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase()
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  otp: z.string().trim().regex(/^\d{6}$/),
  newPassword: strongPasswordSchema
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional()
});

export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPasswordSchema
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

export const incomeSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  source: z.string().trim().min(1).max(120).default('Monthly income'),
  plannedAmount: z.coerce.number().min(0),
  actualAmount: z.coerce.number().min(0).optional()
});

export const expenseSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  paymentMethod: z.string().trim().min(1).max(60),
  description: z.string().trim().max(500).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const expenseUpdateSchema = expenseSchema.partial();
