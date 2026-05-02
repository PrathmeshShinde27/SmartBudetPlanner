# Smart Budget Planner

A production-ready full-stack budget planner inspired by `SmartBudgetPlanner.xlsx`.

The original workbook follows a monthly budgeting flow with income, category budgets, planned vs actual spending, percentage breakdowns, and final remaining balance. This web app turns that Excel logic into a secure multi-user application with authentication, email OTP verification, PostgreSQL storage, live dashboard updates, charts, monthly filtering, Excel export, and admin visibility.

## Features

- Email/password registration and login
- Email OTP verification for new users
- Forgot password flow with OTP verification
- User-level data isolation
- Monthly income setup
- Custom categories grouped as Needs, Wants, and Savings
- Category planned budget editing
- Daily expense logging with amount, category, payment method, description, and date
- Expense edit/delete
- Dashboard totals: Total Budget, Total Planned, Total Spent, Remaining
- Category-wise planned vs actual breakdown
- Pie chart and bar chart using Recharts
- Warning only when spending crosses planned category budget
- Excel export
- Admin dashboard for viewing users and user budget data
- Admin can delete users, but cannot modify user budgets
- Settings page for profile update and password change
- Guide/About section with visible attribution
- Favicon and branded PDF Blackbook documentation

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Recharts, Axios, Lucide React
- Backend: Node.js, Express.js
- Database: PostgreSQL
- Auth/Security: JWT, bcrypt, Helmet, CORS, rate limiting, Zod validation
- Email: Resend for OTP emails
- Export: ExcelJS
- Hosting: Vercel frontend, Render backend, Neon PostgreSQL
- Local database option: Docker Compose PostgreSQL

## Project Structure

```text
client/                              React frontend
client/public/favicon.svg            App favicon
server/                              Express backend
server/db/schema.sql                  PostgreSQL schema
server/scripts/                       DB init/check and Excel seed helpers
docs/                                 Blackbook PDF and editable source
docs/Smart-Budget-Planner-Blackbook.pdf
SmartBudgetPlanner.xlsx               Reference workbook
docker-compose.yml                    Local PostgreSQL setup
render.yaml                           Render deployment config
DEPLOYMENT.md                         Hosting and environment guide
```

## Local Setup

Install dependencies:

```bash
npm install
```

Create environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Backend `server/.env` example:

```env
PORT=4001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/smart_budget_planner
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGINS=http://localhost:5173
TOKEN_EXPIRES_IN=7d
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
EMAIL_FROM="Smart Budget Planner <noreply@example.com>"
```

Frontend `client/.env` example:

```env
VITE_API_URL=http://localhost:4001
```

Start local PostgreSQL with Docker:

```bash
docker compose up -d postgres
```

Initialize database:

```bash
npm run db:init
```

Optional: seed demo/default workbook data:

```bash
npm run seed:excel
```

Run backend and frontend together:

```bash
npm run dev
```

Or run separately:

```bash
npm start --workspace server
npm run dev --workspace client
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:4001/health`

## API Overview

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/verify-email`
- `POST /auth/resend-verification-otp`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `PUT /auth/profile`
- `PUT /auth/password`

Dashboard:

- `GET /dashboard?month=YYYY-MM`

Income:

- `GET /income?month=YYYY-MM`
- `PUT /income`

Expenses:

- `GET /expenses?month=YYYY-MM`
- `POST /expense`
- `PUT /expense/:id`
- `DELETE /expense/:id`

Categories and budgets:

- `GET /categories?month=YYYY-MM`
- `POST /category`
- `PUT /category/:id`
- `DELETE /category/:id`
- `PUT /category/:id/budget`
- `POST /budgets/copy`

Admin:

- `GET /admin/users`
- `GET /admin/users/:userId/dashboard?month=YYYY-MM`
- `GET /admin/users/:userId/categories?month=YYYY-MM`
- `GET /admin/users/:userId/expenses?month=YYYY-MM`
- `DELETE /admin/users/:userId`

Export:

- `GET /export/excel?month=YYYY-MM`

## Admin Setup

Admin access is controlled by the `role` column in the `users` table. Do not hardcode admin credentials in source code.

Example SQL:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'admin@example.com';
```

After updating the role, log out and log in again so the frontend receives the updated user role.

## Documentation

The project Blackbook PDF is available at:

```text
docs/Smart-Budget-Planner-Blackbook.pdf
```

Editable source:

```text
docs/smart-budget-planner-blackbook.html
```

Regenerate the PDF:

```bash
node docs/render-blackbook-pdf.mjs
```

For deployment steps, see [DEPLOYMENT.md](DEPLOYMENT.md).
