import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDashboard } from '../services/dashboardService.js';

export const dashboardRouter = express.Router();

dashboardRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const dashboard = await getDashboard(req.user.id, req.query.month);
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});
