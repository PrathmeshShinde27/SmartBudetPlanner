import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDashboard, getWeeklyAnalysis } from '../services/dashboardService.js';

export const dashboardRouter = express.Router();

dashboardRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const dashboard = await getDashboard(req.user.id, req.query.month);
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get('/week', requireAuth, async (req, res, next) => {
  try {
    const week = await getWeeklyAnalysis(req.user.id, req.query.weekStart);
    res.json(week);
  } catch (error) {
    next(error);
  }
});
