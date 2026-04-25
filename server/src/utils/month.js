import { format } from 'date-fns';

export function currentMonth() {
  return format(new Date(), 'yyyy-MM');
}

export function monthFromDate(value) {
  return format(new Date(value), 'yyyy-MM');
}

export function monthRange(month) {
  return {
    start: `${month}-01`,
    end: `${month}-01`
  };
}

export function assertMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) {
    const error = new Error('Month must use YYYY-MM format');
    error.status = 400;
    error.expose = true;
    throw error;
  }
  return month;
}
