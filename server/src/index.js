import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { budgetsRouter, categoriesRouter } from './routes/categories.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { expensesRouter, singleExpenseRouter } from './routes/expenses.js';
import { exportRouter } from './routes/export.js';
import { incomeRouter } from './routes/income.js';
import { adminRouter } from './routes/admin.js';
import { paymentTypesRouter } from './routes/paymentTypes.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { devMemoryRouter, seedDevMemory } from './routes/devMemory.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/health', (req, res) =>
  res.json({
    status: 'ok',
    mode: config.databaseUrl === 'memory://dev' ? 'memory' : 'postgres',
    timestamp: new Date().toISOString()
  })
);

if (config.databaseUrl === 'memory://dev') {
  await seedDevMemory();
  app.use(devMemoryRouter);
  console.log('Using in-memory development data store');
} else {
  app.use('/auth', authRouter);
  app.use('/dashboard', dashboardRouter);
  app.use('/categories', categoriesRouter);
  app.use('/category', categoriesRouter);
  app.use('/income', incomeRouter);
  app.use('/payment-types', paymentTypesRouter);
  app.use('/admin', adminRouter);
  app.use('/budgets', budgetsRouter);
  app.use('/expenses', expensesRouter);
  app.use('/expense', singleExpenseRouter);
  app.use('/export', exportRouter);
}
app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Smart Budget Planner API listening on http://localhost:${config.port}`);
});
