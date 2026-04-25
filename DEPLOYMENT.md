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

Database skills:

- PostgreSQL
- Relational schema design
- Foreign keys and indexes
- Monthly budget aggregation
- User-level data isolation

Deployment skills:

- Environment variables
- CORS configuration
- Vercel frontend hosting
- Render Node.js API hosting
- Neon managed PostgreSQL
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

## Production Checklist

- Use PostgreSQL, not `memory://dev`.
- Use a strong `JWT_SECRET`.
- Set `CLIENT_ORIGINS` to your real frontend domains only.
- Keep `.env` files out of Git.
- Run `npm run db:init` before using the production API.
- Run `npm run seed:excel` only if you want demo/default workbook categories.
- Test register, login, dashboard, category creation, expense CRUD, month filtering, and Excel export.
- Watch free-tier limits before sharing publicly.
