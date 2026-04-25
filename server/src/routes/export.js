import ExcelJS from 'exceljs';
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDashboard } from '../services/dashboardService.js';

export const exportRouter = express.Router();

exportRouter.get('/excel', requireAuth, async (req, res, next) => {
  try {
    const dashboard = await getDashboard(req.user.id, req.query.month);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart Budget Planner';
    const sheet = workbook.addWorksheet(dashboard.month);

    sheet.addRow([`Smart Budget Planner - ${dashboard.month}`]);
    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').font = { bold: true, size: 16 };

    sheet.addRow([]);
    sheet.addRow(['Total Budget', dashboard.totals.totalBudget]);
    sheet.addRow(['Total Spent', dashboard.totals.totalSpent]);
    sheet.addRow(['Remaining', dashboard.totals.remaining]);
    sheet.addRow(['Savings', dashboard.totals.savings]);
    sheet.addRow([]);
    sheet.addRow(['Category', 'Group', 'Planned', 'Actual', 'Difference', 'Used %']);
    sheet.getRow(8).font = { bold: true };

    dashboard.categories.forEach((item) => {
      sheet.addRow([item.name, item.groupName, item.planned, item.actual, item.difference, item.usedPercent / 100]);
    });

    sheet.columns = [
      { width: 32 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 12 }
    ];

    sheet.getColumn('C').numFmt = '"₹"#,##0.00';
    sheet.getColumn('D').numFmt = '"₹"#,##0.00';
    sheet.getColumn('E').numFmt = '"₹"#,##0.00';
    sheet.getColumn('F').numFmt = '0%';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="smart-budget-${dashboard.month}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
});
