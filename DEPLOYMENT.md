# Smart Budget Planner Deployment Guide

This project is built to test locally first, then deploy on free hosting.

## Languages And Skills Used

Languages:

- JavaScript
- SQL
- HTML
- CSS

Frontend skills:

- React with hooks
- Vite
- Tailwind CSS
- Recharts
- Responsive dashboard UI
- API integration with Axios

Backend skills:

- Node.js
- Express.js
- REST API design
- JWT authentication
- Password hashing with bcrypt
- Request validation with Zod
- PostgreSQL schema design
- Excel import/export with ExcelJS
- Email OTP verification with Resend
- Admin-only API routes

Database skills:

- PostgreSQL
- Relational schema design
- Foreign keys and indexes
- Monthly budget aggregation
- User-level data isolation
- Role-based admin access

Deployment skills:

- Environment variables
- CORS configuration
- Vercel frontend hosting
- Render Node.js API hosting
- Neon managed PostgreSQL
- Resend domain/email setup
- Custom domain setup

## Recommended Free Hosting Stack

Use:

- Frontend: Vercel Hobby plan
- Backend API: Render free web service
- Database: Neon free PostgreSQL
- Domain: connect your custom domain to Vercel

Why this stack:

- Vercel is excellent for React static frontend hosting.
- Render can run the Express API as a Node web service.
- Neon provides hosted PostgreSQL with a free tier and `sslmode=require`.

Free-tier limitations:

- Render free services can sleep when inactive, so the first request after inactivity may be slow.
- Neon free storage and compute are limited.
- Free tiers are good for launch/testing, not heavy traffic.

## Local Testing Options

### Option A: Quick UI/API Test Without PostgreSQL

This uses temporary in-memory data. Data resets when the backend restarts.

`server/.env`:

```env
PORT=4001
DATABASE_URL=memory://dev
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGINS=http://localhost:5173
TOKEN_EXPIRES_IN=7d
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
EMAIL_FROM="Smart Budget Planner <noreply@example.com>"
```

`client/.env`:

```env
VITE_API_URL=http://localhost:4001
```

Run:

```bash
npm run dev --workspace client
npm start --workspace server
```

Demo login:

```text
Email: demo@budget.local
Password: Password123!
```

### Option B: Full Local PostgreSQL Test

Install PostgreSQL locally or use Docker.

With Docker:

```bash
docker compose up -d postgres
```

`server/.env`:

```env
PORT=4001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/smart_budget_planner
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGINS=http://localhost:5173
TOKEN_EXPIRES_IN=7d
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
EMAIL_FROM="Smart Budget Planner <noreply@example.com>"
```

Run:

```bash
npm run db:init
npm run seed:excel
npm start --workspace server
npm run dev --workspace client
```

## Production Deployment

### 1. Create Neon PostgreSQL Database

1. Create a free Neon account.
2. Create a new project.
3. Copy the pooled or direct PostgreSQL connection string.
4. Ensure the connection string includes SSL, usually:

```text
?sslmode=require
```

Example:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

### 2. Deploy Backend API On Render

1. Push this project to GitHub.
2. In Render, create a new Web Service from the GitHub repo.
3. Use these settings:

```text
Root Directory: leave blank
Build Command: npm install
Start Command: npm start --workspace server
Health Check Path: /health
```

Environment variables:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=your Neon PostgreSQL URL
JWT_SECRET=generate a long random secret
CLIENT_ORIGINS=https://your-domain.com,https://your-vercel-project.vercel.app
TOKEN_EXPIRES_IN=7d
RESEND_API_KEY=your Resend API key
EMAIL_FROM="Smart Budget Planner <noreply@your-domain.com>"
```

After first deploy, run the database setup from your local machine using the Neon `DATABASE_URL`:

```bash
npm run db:init
npm run seed:excel
```

### 3. Deploy Frontend On Vercel

1. Import the GitHub repo into Vercel.
2. Set the root directory to:

```text
client
```

3. Build settings:

```text
Build Command: npm run build
Output Directory: dist
```

4. Environment variable:

```env
VITE_API_URL=https://your-render-api.onrender.com
```

5. Deploy.

### 4. Connect Your Domain

Point your domain to the Vercel frontend project.

After Vercel gives you the final production domain, update Render:

```env
CLIENT_ORIGINS=https://your-domain.com,https://your-vercel-project.vercel.app
```

Then redeploy the Render API.

### 5. Configure Resend Email OTP

The app uses Resend to send OTP emails for:

- New user email verification
- Forgot password reset

Recommended production setup:

1. Create a Resend account.
2. Add and verify your domain in Resend, for example `prathmeshshinde.com`.
3. Add the DNS records shown by Resend inside GoDaddy DNS.
4. Wait until Resend shows the domain as verified.
5. Create an API key in Resend.
6. Add the API key to Render as `RESEND_API_KEY`.
7. Set `EMAIL_FROM` in Render using a verified sender, for example:

```env
EMAIL_FROM="Smart Budget Planner <noreply@your-domain.com>"
```

Do not commit the Resend API key to GitHub.

### 6. Admin Setup

Admin accounts are not hardcoded in the project. Create a normal user first, verify email, then update that user role in Neon.

Example SQL:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'admin@example.com';
```

After this, log out and log in again. The sidebar will show the Admin page for users with `role = 'admin'`.

Admin can:

- View all users
- View a selected user's dashboard
- View a selected user's categories and expenses
- Delete a user

Admin cannot modify another user's budgets or expenses.

## Production Checklist

- Use PostgreSQL, not `memory://dev`.
- Use a strong `JWT_SECRET`.
- Set `CLIENT_ORIGINS` to your real frontend domains only.
- Set `RESEND_API_KEY` and `EMAIL_FROM` for OTP emails.
- Keep `.env` files out of Git.
- Run `npm run db:init` before using the production API.
- Run `npm run seed:excel` only if you want demo/default workbook categories.
- Test register, email OTP verification, login, forgot password, dashboard, income update, category creation, expense CRUD, month filtering, admin page, and Excel export.
- Watch free-tier limits before sharing publicly.

## Current Production Services

Use these values as references when checking deployment dashboards:

- Backend API: `https://smart-budget-planner-api-bi1c.onrender.com`
- Frontend: `https://smart-budet-planner-client.vercel.app`
- Main domain: `prathmeshshinde.com`

If a custom subdomain is connected later, add that subdomain to both:

- Vercel project domains
- Render `CLIENT_ORIGINS`
