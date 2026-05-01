import { query } from '../db.js';

export async function requireAdmin(req, res, next) {
  try {
    const result = await query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (result.rows[0]?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
