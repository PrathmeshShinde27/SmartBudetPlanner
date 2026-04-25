import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workbookPath = path.join(__dirname, '..', '..', 'SmartBudgetPlanner.xlsx');
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(workbookPath);
const sheet = workbook.worksheets[0];
const monthNames = {
  January: '01',
  February: '02',
  March: '03',
  April: '04',
  May: '05',
  June: '06',
  July: '07',
  August: '08',
  September: '09',
  October: '10',
  November: '11',
  December: '12'
};
const [, monthName, year] = sheet.name.match(/^([A-Za-z]+)-(\d{4})$/) || [];
const month = monthName && year ? `${year}-${monthNames[monthName] || '01'}` : '2026-04';

const ranges = [
  { groupName: 'Needs', nameCol: 2, amountCol: 3, start: 21, end: 35 },
  { groupName: 'Wants', nameCol: 7, amountCol: 8, start: 21, end: 35 },
  { groupName: 'Savings', nameCol: 12, amountCol: 13, start: 21, end: 35 }
];

const categories = ranges.flatMap((range) => {
  const rows = [];
  for (let row = range.start; row <= range.end; row += 1) {
    const name = sheet.getCell(row, range.nameCol).value;
    const amount = sheet.getCell(row, range.amountCol).value;
    if (typeof name === 'string' && name.trim()) {
      rows.push({
        name: name.trim(),
        groupName: range.groupName,
        plannedAmount: Number(amount || 0)
      });
    }
  }
  return rows;
});

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
});
const client = await pool.connect();

try {
  await client.query('BEGIN');
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const userResult = await client.query(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    ['demo@budget.local', passwordHash, 'Demo User']
  );
  const userId = userResult.rows[0].id;

  for (const item of categories) {
    const categoryResult = await client.query(
      `INSERT INTO categories (user_id, name, group_name, default_budget)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, name)
       DO UPDATE SET group_name = EXCLUDED.group_name, default_budget = EXCLUDED.default_budget
       RETURNING id`,
      [userId, item.name, item.groupName, item.plannedAmount]
    );
    await client.query(
      `INSERT INTO monthly_budgets (user_id, category_id, month, planned_amount)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, category_id, month)
       DO UPDATE SET planned_amount = EXCLUDED.planned_amount`,
      [userId, categoryResult.rows[0].id, month, item.plannedAmount]
    );
  }

  await client.query('COMMIT');
  console.log(`Seeded ${categories.length} categories for demo@budget.local`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
