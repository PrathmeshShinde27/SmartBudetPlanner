# Smart Budget Planner

A production-oriented full-stack budget planner inspired by `SmartBudgetPlanner.xlsx`.

The workbook uses a 50/30/20 monthly budgeting structure with income, category budgets, planned vs actual spending, percentage breakdowns, final leftover, and emergency-fund planning. This app turns that model into a multi-user web app with isolated data, live dashboard updates, monthly filtering, editable expenses, category budgets, budget alerts, dark mode, and Excel export.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, Recharts
- Backend: Node.js, Express
- Database: PostgreSQL
- Auth: Email/password with bcrypt password hashes and JWT access tokens

## Project Structure

```text
client/                 React app
server/                 Express API
server/db/schema.sql    PostgreSQL schema
server/scripts/         DB init and Excel seed helpers
SmartBudgetPlanner.xlsx Reference workbook
```

## Setup

1. Create a PostgreSQL database.

With Docker:

```bash
docker compose up -d postgres
```

2. Copy environment files.

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

3. Update `server/.env`.

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/smart_budget_planner
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173
```

4. Install dependencies.

```bash
npm install
```

5. Initialize the database.

```bash
npm run db:init
```

6. Optional: seed a user and categories from the provided Excel file.

```bash
npm run seed:excel
```

Seed login:

```text
Email: demo@budget.local
Password: Password123!
```

7. Run the app.

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:4000`

For local testing without PostgreSQL and for production deployment on free hosting, see [DEPLOYMENT.md](DEPLOYMENT.md).

## API

Auth:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Dashboard:

- `GET /dashboard?month=YYYY-MM`

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

Export:

- `GET /export/excel?month=YYYY-MM`
